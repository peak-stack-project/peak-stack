(() => {
    const moeda = (valor) => new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0
    }).format(valor);

    const legendaComum = {
        position: "bottom",
        labels: { usePointStyle: true, pointStyle: "rect", boxWidth: 11, boxHeight: 8, padding: 14, color: "#536177", font: { family: "Inter", size: 10 } }
    };
    const eixoComum = {
        grid: { color: "#e9edf2", drawBorder: false },
        border: { display: false },
        ticks: { color: "#627087", font: { family: "Inter", size: 9 }, maxTicksLimit: 5 }
    };

    const graficoComponentes = new Chart(document.getElementById("graficoComponentes"), {
        type: "bar",
        data: {
            labels: ["Máquina", "Armazenamento", "Rede"],
            datasets: [{
                label: "Gasto mensal",
                data: [720, 295, 680, 145],
                backgroundColor: ["#3977d4", "#f2ad19", "#df4b5c"],
                borderRadius: 2,
                maxBarThickness: 54
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { ...legendaComum, onClick() {}, labels: { ...legendaComum.labels, generateLabels(chart) {
                    return chart.data.labels.map((label, index) => ({ text: label, fillStyle: chart.data.datasets[0].backgroundColor[index], strokeStyle: "transparent", hidden: false, index }));
                } } },
                tooltip: { callbacks: { label: (context) => ` ${moeda(context.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, border: { display: false }, ticks: { color: "#26344a", font: { family: "Inter", size: 10 } } },
                y: { ...eixoComum, beginAtZero: true, max: 800, ticks: { ...eixoComum.ticks, callback: (value) => moeda(value) } }
            }
        }
    });

    const graficoUsuarios = new Chart(document.getElementById("graficoUsuarios"), {
        type: "scatter",
        data: {
            datasets: [
                { label: "Cada ponto = um dia", data: [], borderColor: "#5688b5", backgroundColor: "rgba(86,136,181,.7)", pointRadius: 4, pointHoverRadius: 6 },
                { label: "Tend\u00eancia", data: [], showLine: true, pointRadius: 0, borderColor: "#e09a3d", borderDash: [5, 4], borderWidth: 2, fill: false }
            ]
        },
        options: {
            maintainAspectRatio: false,
            interaction: { intersect: true, mode: "nearest" },
            plugins: {
                legend: legendaComum,
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                        title: (items) => `Dia ${String(items[0].raw.dia).padStart(2, "0")}`,
                        label(context) { return [` Usu\u00e1rios: ${context.raw.x}`, ` Custo di\u00e1rio: ${moeda(context.raw.y)}`]; }
                    }
                }
            },
            scales: {
                x: { ...eixoComum, type: "linear", title: { display: true, text: "Volume de usuários", color: "#536177", font: { family: "Inter", size: 9 } }, ticks: { ...eixoComum.ticks, precision: 0 } },
                y: { ...eixoComum, beginAtZero: true, title: { display: true, text: "Custo diário (R$)", color: "#536177", font: { family: "Inter", size: 9 } }, ticks: { ...eixoComum.ticks, callback: (value) => moeda(value) } }
            }
        }
    });

    const rotulosProjecao = ["Nov 2026", "Dez 2026", "Jan 2027", "Fev 2027", "Mar 2027", "Abr 2027"];
    const graficoProjecao = new Chart(document.getElementById("graficoProjecao"), {
        type: "line",
        data: {
            labels: rotulosProjecao,
            datasets: [
                { label: "Histórico", data: [1370, 1490, null, null, null, null], borderColor: "#4c78bd", backgroundColor: "rgba(91,130,199,.3)", fill: "origin", tension: .35, pointRadius: 2, borderWidth: 2 },
                { label: "Previsão", data: [1370, 1490, 1620, 1740, 1830, 1910], borderColor: "#6297c0", backgroundColor: "rgba(121,173,211,.2)", fill: false, borderDash: [5, 4], tension: .32, pointRadius: 2, borderWidth: 2 },
                { label: "Intervalo de Confiança", data: [null, 1490, 1840, 2000, 2160, 2320], borderColor: "transparent", backgroundColor: "rgba(139,190,220,.25)", fill: { target: "confidenceLower" }, pointRadius: 0, tension: .32 },
                { label: "confidenceLower", id: "confidenceLower", data: [null, 1490, 1430, 1510, 1570, 1630], borderColor: "transparent", backgroundColor: "rgba(139,190,220,.25)", fill: false, pointRadius: 0, tension: .32 },
                { label: "Limite do Orçamento", data: [1550, 1550, 1550, 1550, 1550, 1550], borderColor: "#9b9a99", borderDash: [5, 5], pointRadius: 0, borderWidth: 1.5, fill: false }
            ]
        },
        options: {
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            plugins: {
                legend: { ...legendaComum, labels: { ...legendaComum.labels, filter: (item) => item.text !== "confidenceLower" } },
                tooltip: { filter: (item) => item.dataset.label !== "confidenceLower", callbacks: { label: (context) => ` ${context.dataset.label}: ${moeda(context.raw)}` } }
            },
            scales: {
                x: { ...eixoComum, grid: { display: false } },
                y: { ...eixoComum, beginAtZero: true, suggestedMax: 2500, ticks: { ...eixoComum.ticks, callback: (value) => moeda(value) } }
            }
        }
    });

    function atualizarSerieUsuarios(dias) {
        const usuarios = [];
        for (let deslocamento = dias - 1; deslocamento >= 0; deslocamento--) {
            usuarios.push(Math.round(82 + 17 * Math.sin((dias - deslocamento) * .48) + 12 * Math.sin((dias - deslocamento) * .17) + (dias - deslocamento) * .24));
        }
        const pontos = usuarios.map((volume, index) => ({
            x: volume,
            y: Math.round(12 + volume * .38 + 5 * Math.sin((index + 1) * .77)),
            dia: index + 1
        }));
        const mediaX = pontos.reduce((soma, ponto) => soma + ponto.x, 0) / pontos.length;
        const mediaY = pontos.reduce((soma, ponto) => soma + ponto.y, 0) / pontos.length;
        const inclinacao = pontos.reduce((soma, ponto) => soma + (ponto.x - mediaX) * (ponto.y - mediaY), 0)
            / pontos.reduce((soma, ponto) => soma + (ponto.x - mediaX) ** 2, 0);
        const intercepto = mediaY - inclinacao * mediaX;
        const menorX = Math.min(...pontos.map((ponto) => ponto.x));
        const maiorX = Math.max(...pontos.map((ponto) => ponto.x));

        graficoUsuarios.data.datasets[0].data = pontos;
        graficoUsuarios.data.datasets[1].data = [
            { x: menorX, y: inclinacao * menorX + intercepto },
            { x: maiorX, y: inclinacao * maiorX + intercepto }
        ];
        graficoUsuarios.update();
    }

    document.getElementById("periodo").addEventListener("change", (event) => {
        atualizarSerieUsuarios(Number(event.target.value));
    });
    atualizarSerieUsuarios(30);

    const toggleFiltro = document.getElementById("toggleFiltro");
    const painelFiltro = document.getElementById("painelFiltro");
    toggleFiltro.addEventListener("click", () => {
        const aberto = toggleFiltro.getAttribute("aria-expanded") === "true";
        toggleFiltro.setAttribute("aria-expanded", String(!aberto));
        painelFiltro.hidden = aberto;
    });
    document.getElementById("filtroComponente").addEventListener("change", (event) => {
        const componente = event.target.value;
        const componentes = ["CPU", "RAM", "Disco", "Rede"];
        graficoComponentes.data.labels = componente === "todos" ? componentes : [componente];
        graficoComponentes.data.datasets[0].data = componente === "todos" ? [720, 295, 680, 145] : [["CPU", 720], ["RAM", 295], ["Disco", 680], ["Rede", 145]].filter(([nome]) => nome === componente).map(([, valor]) => valor);
        graficoComponentes.data.datasets[0].backgroundColor = componente === "todos" ? ["#3977d4", "#f2ad19", "#df4b5c", "#3da987"] : [["CPU", "#3977d4"], ["RAM", "#f2ad19"], ["Disco", "#df4b5c"], ["Rede", "#3da987"]].filter(([nome]) => nome === componente).map(([, cor]) => cor);
        graficoComponentes.update();
    });
})();
