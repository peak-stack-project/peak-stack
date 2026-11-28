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

// Uso de Componentes — últimas 24h: área = Volume de Requisições (RPS), linha laranja = Latência Média (ms)
// Os dados vêm de /dashboard/latencia/:idEmpresa (latenciaController) e são preenchidos por carregarLatencia()
var COR_LATENCIA = "#f58220";
var COR_LIMITE = "#ef4444";
var picosLatencia = [];
var limiteAlertaLatencia = null;

// Escreve um aviso no meio do gráfico enquanto não houver leitura de latência
var avisoSemLatencia = {
    id: "avisoSemLatencia",
    afterDraw: function (chart) {
        var temDado = chart.data.datasets[1].data.some(function (v) { return v != null; });
        if (temDado) return;
        var a = chart.chartArea, c = chart.ctx;
        c.save();
        c.fillStyle = "#91a0bb"; c.font = "12px Inter"; c.textAlign = "center";
        c.fillText("Aguardando leituras de latência...", (a.left + a.right) / 2, (a.top + a.bottom) / 2);
        c.restore();
    }
};

var grafSaude = new Chart(ctxCpu, {
    type: "line",
    data: {
        labels: HORAS,
        datasets: [
            { label: "Volume de Requisições (RPS)", data: [], yAxisID: "y", order: 2,
              borderColor: "#3b82f6", backgroundColor: gradiente, fill: true,
              tension: 0.4, borderWidth: 2, spanGaps: true, pointRadius: 3, pointHoverRadius: 5,
              pointBackgroundColor: "#3b82f6", pointBorderColor: "#3b82f6" },
            { label: "Latência Média (ms)", data: [], yAxisID: "y1", order: 1,
              borderColor: COR_LATENCIA, backgroundColor: "rgba(245, 130, 32, 0.25)", fill: false,
              tension: 0.4, borderWidth: 2, spanGaps: true, pointRadius: 3, pointHoverRadius: 5,
              pointBackgroundColor: COR_LATENCIA, pointBorderColor: COR_LATENCIA },
            { label: "Limite de alerta", data: [], yAxisID: "y1", order: 0,
              borderColor: COR_LIMITE, backgroundColor: "rgba(239, 68, 68, 0.15)", fill: false,
              borderDash: [6, 4], borderWidth: 2, tension: 0, pointRadius: 0, pointHoverRadius: 0 }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
            x: { grid: { display: false },
                 ticks: { autoSkip: false, maxRotation: 40, minRotation: 40, font: { family: "Inter", size: 11 }, color: "#52617d" } },
            y: { beginAtZero: true, suggestedMax: 1000, position: "left",
                 ticks: { maxTicksLimit: 6, font: { family: "Inter", size: 11 }, color: "#52617d",
                          callback: function (v) { return v >= 1000 ? (v / 1000).toLocaleString("pt-BR") + "k" : v; } },
                 grid: { color: "#f3f4f6" }, border: { display: false } },
            y1: { beginAtZero: true, suggestedMax: 100, position: "right",
                  ticks: { maxTicksLimit: 6, font: { family: "Inter", size: 11 }, color: COR_LATENCIA,
                           callback: function (v) { return v + " ms"; } },
                  grid: { drawOnChartArea: false }, border: { display: false } }
        },
        plugins: {
            legend: { display: true, position: "top",
                      labels: { font: { family: "Inter", size: 12 }, boxWidth: 12, boxHeight: 12, color: "#374151",
                                sort: function (a, b) { return a.datasetIndex - b.datasetIndex; } } },
            tooltip: { callbacks: { label: function (c) {
                if (c.datasetIndex === 2) return " Limite de alerta: " + c.raw + " ms";
                if (c.raw == null) return " " + c.dataset.label + ": sem leitura";
                if (c.datasetIndex === 1) {
                    var pico = picosLatencia[c.dataIndex];
                    var acima = limiteAlertaLatencia != null && c.raw >= limiteAlertaLatencia ? "  ⚠ acima do limite" : "";
                    return " Latência média: " + c.raw + " ms" + (pico != null ? " (pico " + pico + " ms)" : "") + acima;
                }
                return " Requisições: " + Number(c.raw).toLocaleString("pt-BR") + " por segundo";
            } } }
        }
    },
    plugins: [avisoSemLatencia]
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

// ----- gráfico de latência (dados por hora, então atualiza a cada 30s) -----
function carregarLatencia() {
    if (!idEmpresa) return;

    fetch(`/dashboard/latencia/${idEmpresa}`)
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
            grafSaude.data.labels = d.rotulos;
            grafSaude.data.datasets[0].data = d.requisicoes;
            grafSaude.data.datasets[1].data = d.latencia;
            picosLatencia = d.picoLatencia;

            // linha do limite de alerta (mesmo valor em todas as horas)
            limiteAlertaLatencia = d.limiteAlerta;
            var serieLatencia = grafSaude.data.datasets[1];
            var serieLimite = grafSaude.data.datasets[2];
            serieLimite.label = "Limite de alerta (" + d.limiteAlerta + " ms)";
            serieLimite.data = d.rotulos.map(function () { return d.limiteAlerta; });

            // pontos que passaram do limite ficam vermelhos e maiores
            var acima = d.latencia.map(function (v) { return v != null && v >= d.limiteAlerta; });
            serieLatencia.pointBackgroundColor = acima.map(function (a) { return a ? COR_LIMITE : COR_LATENCIA; });
            serieLatencia.pointBorderColor = serieLatencia.pointBackgroundColor;
            serieLatencia.pointRadius = acima.map(function (a) { return a ? 5 : 3; });

            // garante que a linha do limite sempre aparece no eixo da direita
            grafSaude.options.scales.y1.suggestedMax = Math.ceil(d.limiteAlerta * 1.3);
            grafSaude.update();
        })
        .catch(function (erro) { console.log("Erro ao carregar o gráfico de latência:", erro); });
}

carregarDashboard();
setInterval(carregarDashboard, 5000);
carregarLatencia();
setInterval(carregarLatencia, 30000);