// Dashboard "Visão geral": busca os dados do banco e atualiza KPIs, gráficos e ranking.
var idEmpresa = sessionStorage.FKEMPRESA_USUARIO;

var CORES = { Normal: "#3f6df6", Alerta: "#f59e0b", "Crítico": "#ef4444" };
var HORAS = [];
for (var h = 0; h < 24; h++) HORAS.push(String(h).padStart(2, "0") + ":00h");

// ----- gráficos (criados vazios; carregarDashboard() preenche) -----
var ctxCpu = document.getElementById("graficoCpu").getContext("2d");
var gradiente = ctxCpu.createLinearGradient(0, 0, 600, 0);
gradiente.addColorStop(0, "rgba(59, 130, 246, 0.4)");
gradiente.addColorStop(1, "rgba(168, 85, 247, 0.4)");

var grafSaude = new Chart(ctxCpu, {
    type: "line",
    data: {
        labels: HORAS,
        datasets: [
            { label: "Requisições (RPS)", data: [], borderColor: "#3b82f6", backgroundColor: gradiente,
              fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, spanGaps: true },
            { label: "Latência Média (ms)", data: [], borderColor: "#f43f5e",
              fill: false, tension: 0.4, borderWidth: 2, pointRadius: 0, spanGaps: true },
            { label: "Meta de SLA (100ms)", data: Array(24).fill(85), borderColor: "#10b981",
              fill: false, tension: 0, borderWidth: 2, pointRadius: 0 }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
            y: { min: 0, max: 100, title: { display: true, text: "%", font: { family: "Inter", size: 12 } },
                 ticks: { stepSize: 25, font: { family: "Inter", size: 11 } }, grid: { color: "#f3f4f6" } },
            x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } }
        },
        plugins: { legend: { display: true, position: "top", labels: { font: { family: "Inter", size: 12 }, boxWidth: 12 } } }
    }
});

var grafStatus = new Chart(document.getElementById("graficoStatus").getContext("2d"), {
    type: "doughnut",
    data: { labels: ["Normal", "Atenção", "Crítico"],
            datasets: [{ data: [0, 0, 0], backgroundColor: ["#3b82f6", "#f59e0b", "#ef4444"], borderWidth: 0, hoverOffset: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "70%", plugins: { legend: { display: false } } }
});

var grafDisco = new Chart(document.getElementById("graficoDisco"), {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Uso de disco (%)", data: [], backgroundColor: [],
                                     borderRadius: 4, borderSkipped: false, barThickness: 13 }] },
    options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        layout: { padding: { left: 10, right: 20 } },
        scales: {
            x: { beginAtZero: true, max: 100,
                 ticks: { stepSize: 25, callback: function (v) { return v + "%"; }, font: { family: "Inter", size: 10 }, color: "#91a0bb" },
                 grid: { color: "#f0f2f7" }, border: { display: false } },
            y: { afterFit: function (scale) { scale.width = 105; },
                 ticks: { padding: 8, font: { family: "Inter", size: 10 }, color: "#52617d" },
                 grid: { display: false }, border: { display: false } }
        },
        plugins: { legend: { display: false },
                   tooltip: { callbacks: { label: function (c) { return " " + c.raw + "% utilizado"; } } } }
    }
});

// ----- helpers do ranking -----
function pct(v) { return v == null ? "--" : v + "%"; }
function classeValor(v) {
    if (v == null) return "";
    return v >= 85 ? 'class="valor vermelho_texto"' : v >= 70 ? 'class="valor amarelo_texto"' : "";
}

function desenharRanking(servidores) {
    var posicao = { "Crítico": "vermelho", Alerta: "laranja", Normal: "cinza" };
    var classeStatus = { "Crítico": "offline", Alerta: "alerta", Normal: "online" };
    var rotulo = { "Crítico": "Crítico", Alerta: "Atenção", Normal: "Normal" };

    var html = document.querySelector("#tabela_ranking .cabecalho").outerHTML;
    servidores.forEach(function (s, i) {
        html += `
            <div class="linha_tabela">
                <span class="posicao ${posicao[s.status]}">${i + 1}</span>
                <span><a href="./visao_especifica.html?id=${s.idMaquina}">${s.servidor}</a></span>
                <span>${s.empresa}</span>
                <span ${classeValor(s.cpu)}>${pct(s.cpu)}</span>
                <span ${classeValor(s.ram)}>${pct(s.ram)}</span>
                <span ${classeValor(s.disco)}>${pct(s.disco)}</span>
                <span class="status ${classeStatus[s.status]}">${s.offline ? "Offline" : rotulo[s.status]}</span>
            </div>`;
    });
    document.getElementById("tabela_ranking").innerHTML = html;
}

// ----- busca e atualiza -----
function carregarDashboard() {
    if (!idEmpresa) { console.log("Sessão sem empresa (FKEMPRESA_USUARIO)."); return; }

    fetch(`/dashboard/visaoGeral/${idEmpresa}`)
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
            // gráfico de saúde
            grafSaude.data.datasets[0].data = d.serieCpu;
            grafSaude.data.datasets[1].data = d.serieRam;
            grafSaude.update();

            // donut
            grafStatus.data.datasets[0].data = [d.status.Normal, d.status.Alerta, d.status["Crítico"]];
            grafStatus.update();

            // barras de disco
            var comDisco = d.servidores.filter(function (s) { return s.disco != null; });
            grafDisco.data.labels = comDisco.map(function (s) { return s.servidor; });
            grafDisco.data.datasets[0].data = comDisco.map(function (s) { return s.disco; });
            grafDisco.data.datasets[0].backgroundColor = comDisco.map(function (s) { return CORES[s.status]; });
            grafDisco.update();

            // KPIs
            var crit = d.status["Crítico"], aten = d.status.Alerta;
            document.getElementById("kpi_disp").innerHTML = d.disponibilidade == null ? "--" : d.disponibilidade + "%";
            document.getElementById("kpi_alertas").innerHTML = (crit + aten) + " Ativos";
            document.getElementById("kpi_alertas_detalhe").innerHTML = crit + " Crítico • " + aten + " Atenção";
            if (d.maquinaCritica) {
                document.getElementById("kpi_critica").innerHTML = d.maquinaCritica.servidor;
                var p = d.maquinaCritica.pior;
                document.getElementById("kpi_critica_motivo").innerHTML = p ? p.tipo + " em " + p.valor + "%" : "";
            } else {
                document.getElementById("kpi_critica").innerHTML = "Nenhuma";
                document.getElementById("kpi_critica_motivo").innerHTML = "Nenhuma máquina em estado crítico";
            }

            desenharRanking(d.servidores);
        })
        .catch(function (erro) { console.log("Erro ao carregar a dashboard:", erro); });
}

carregarDashboard();
setInterval(carregarDashboard, 5000);