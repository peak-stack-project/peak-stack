var idEmpresa = sessionStorage.FKEMPRESA_USUARIO;

var COR_INTERNO = "#3f6df6";
var COR_EXTERNO = "#f59e0b";
var CORES_ESTADOS = ["#3b82f6", "#94a3b8", "#f59e0b", "#ef4444", "#cbd5e1"];
var LIMITE_SYN_ALERTA = 20;
var LIMITE_SYN_CRITICO = 50;
var carregando = false;

var ctxConexoes = document.getElementById("graficoConexoes").getContext("2d");
var gradiente = ctxConexoes.createLinearGradient(0, 0, 600, 0);
gradiente.addColorStop(0, "rgba(59, 130, 246, 0.4)");
gradiente.addColorStop(1, "rgba(168, 85, 247, 0.4)");

var grafConexoes = new Chart(ctxConexoes, {
    type: "line",
    data: {
        labels: [],
        datasets: [
            {
                label: "Conexões ativas", data: [], borderColor: "#3b82f6", backgroundColor: gradiente,
                fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointBackgroundColor: "#ef4444",
                spanGaps: true, yAxisID: "y"
            },
            {
                label: "Novas conexões por minuto", data: [], borderColor: "#f43f5e",
                fill: false, tension: 0.4, borderWidth: 2, pointRadius: 0, spanGaps: true, yAxisID: "y1"
            },
            {
                label: "Limite de anomalia", data: [], borderColor: "#f59e0b",
                fill: false, tension: 0, borderWidth: 2, borderDash: [6, 4], pointRadius: 0, spanGaps: true, yAxisID: "y"
            }
        ]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
            y: {
                beginAtZero: true, position: "left",
                title: { display: true, text: "Conexões", font: { family: "Inter", size: 12 } },
                ticks: { precision: 0, font: { family: "Inter", size: 11 } }, grid: { color: "#f3f4f6" }
            },
            y1: {
                beginAtZero: true, position: "right",
                title: { display: true, text: "Novas por minuto", font: { family: "Inter", size: 12 } },
                ticks: { precision: 0, font: { family: "Inter", size: 11 } }, grid: { drawOnChartArea: false }
            },
            x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { family: "Inter", size: 11 } } }
        },
        plugins: { legend: { display: true, position: "top", labels: { font: { family: "Inter", size: 12 }, boxWidth: 12 } } }
    }
});

var grafEstados = new Chart(document.getElementById("graficoEstados").getContext("2d"), {
    type: "doughnut",
    data: {
        labels: ["ESTABLISHED", "TIME_WAIT", "CLOSE_WAIT", "SYN_RECV", "Outras"],
        datasets: [{
            data: [0, 0, 0, 0, 0],
            backgroundColor: CORES_ESTADOS,
            borderWidth: 0,
            hoverOffset: 4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        layout: {
            padding: { right: 8 }
        },
        plugins: {
            legend: {
                display: true,
                position: "right",
                align: "center",
                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 7,
                    boxHeight: 7,
                    padding: 10,
                    color: "#52617d",
                    font: { family: "Inter", size: 10 }
                }
            }
        }
    }
});

var grafTrafego = new Chart(document.getElementById("graficoIps"), {
    type: "bar",
    data: {
        labels: [],
        datasets: [
            { label: "Download (Mbps)", data: [], backgroundColor: COR_INTERNO, borderRadius: 4, borderSkipped: false, barThickness: 10 },
            { label: "Upload (Mbps)", data: [], backgroundColor: COR_EXTERNO, borderRadius: 4, borderSkipped: false, barThickness: 10 }
        ]
    },
    options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 10, right: 20 } },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { font: { family: "Inter", size: 10 }, color: "#91a0bb" },
                grid: { color: "#f0f2f7" }, border: { display: false }
            },
            y: {
                afterFit: function (scale) { scale.width = 110; },
                ticks: { padding: 8, font: { family: "Inter", size: 10 }, color: "#52617d" },
                grid: { display: false }, border: { display: false }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function (c) { return " " + c.dataset.label + ": " + c.raw + " Mbps"; } } }
        }
    }
});

function escapar(texto) {
    return String(texto == null ? "" : texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escrever(id, texto) {
    var elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
}

function numero(v) {
    return v == null ? "--" : Number(v).toLocaleString("pt-BR");
}

function textoVariacao(v) {
    if (v == null) return "Sem histórico para comparar";
    if (v > 0) return "+" + v + "% acima do normal";
    if (v < 0) return Math.abs(v) + "% abaixo do normal";
    return "Dentro do normal";
}

function textoSyn(v) {
    if (v == null) return "";
    if (v >= LIMITE_SYN_CRITICO) return "Possível SYN flood";
    if (v >= LIMITE_SYN_ALERTA) return "Acima do normal";
    return "Dentro do normal";
}

function classeSyn(v) {
    if (v == null) return "";
    return v >= LIMITE_SYN_CRITICO ? 'class="valor vermelho_texto"' : v >= LIMITE_SYN_ALERTA ? 'class="valor amarelo_texto"' : "";
}

function desenharRanking(servidores) {
    var posicao = { "Crítico": "vermelho", Alerta: "laranja", Normal: "cinza" };
    var classeStatus = { "Crítico": "offline", Alerta: "alerta", Normal: "online" };
    var rotulo = { "Crítico": "Crítico", Alerta: "Atenção", Normal: "Normal" };

    var html = document.querySelector("#tabela_ranking .cabecalho").outerHTML;
    servidores.forEach(function (s, i) {
        var status = posicao[s.status] ? s.status : "Normal";
        html += `
            <div class="linha_tabela">
                <span class="posicao ${posicao[status]}">${i + 1}</span>
                <span><a href="./visao_especifica.html?id=${escapar(s.idMaquina)}">${escapar(s.servidor)}</a></span>
                <span>${escapar(s.empresa)}</span>
                <span>${numero(s.conexoes)}</span>
                <span ${classeSyn(s.syn)}>${numero(s.syn)}</span>
                <span>${numero(s.portas)}</span>
                <span class="status ${classeStatus[status]}">${s.offline ? "Offline" : rotulo[status]}</span>
            </div>`;
    });
    document.getElementById("tabela_ranking").innerHTML = html;
}

function desenharEventos(eventos) {
    var lista = document.getElementById("lista_eventos");
    if (!lista) return;

    var cor = { "Crítico": "vermelho_texto", Alerta: "amarelo_texto" };
    var html = "";

    if (eventos.length == 0) {
        html = '<div class="evento">Nenhum evento de segurança nas últimas horas</div>';
    }

    eventos.forEach(function (e) {
        html += `
            <div class="evento">
                <span class="evento_hora">${escapar(e.hora)}</span>
                <span class="${cor[e.nivel] || ""}">${escapar(e.texto)}</span>
            </div>`;
    });
    lista.innerHTML = html;
}

function carregarDashboard() {
    if (!idEmpresa) { console.log("Sessão sem empresa (FKEMPRESA_USUARIO)."); return; }
    if (carregando) return;
    carregando = true;

    fetch(`/dashboard/seguranca/${idEmpresa}`)
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (d) {
            var serie = d.serie;
            var acimaDoLimite = serie.conexoes.map(function (v, i) {
                return serie.limite[i] != null && v > serie.limite[i] ? 4 : 0;
            });

            grafConexoes.data.labels = serie.rotulos;
            grafConexoes.data.datasets[0].data = serie.conexoes;
            grafConexoes.data.datasets[0].pointRadius = acimaDoLimite;
            grafConexoes.data.datasets[1].data = serie.novas;
            grafConexoes.data.datasets[2].data = serie.limite;
            grafConexoes.update("none");

            var e = d.estados;
            grafEstados.data.datasets[0].data = [e.established, e.timeWait, e.closeWait, e.synRecv, e.outras];
            grafEstados.update("none");

            var trafego = d.trafego || [];
            grafTrafego.data.labels = trafego.map(function (x) { return x.servidor; });
            grafTrafego.data.datasets[0].data = trafego.map(function (x) { return x.download; });
            grafTrafego.data.datasets[1].data = trafego.map(function (x) { return x.upload; });
            grafTrafego.update("none");

            var k = d.kpis;
            escrever("kpi_conexoes", numero(k.conexoes));
            escrever("kpi_conexoes_detalhe", textoVariacao(k.variacaoConexoes));
            escrever("kpi_novas", numero(k.novasPorMinuto));
            escrever("kpi_novas_detalhe", "Média: " + numero(k.mediaNovasPorMinuto) + " por minuto");
            escrever("kpi_syn", numero(k.syn));
            escrever("kpi_syn_detalhe", textoSyn(k.syn));
            escrever("kpi_portas", numero(k.portasAbertas));
            escrever("kpi_portas_detalhe", k.portasNovas > 0 ? k.portasNovas + " nova(s) na última hora" : "Nenhuma porta nova");

            desenharRanking(d.servidores);
            desenharEventos(d.eventos || []);
        })
        .catch(function (erro) { console.log("Erro ao carregar a dashboard:", erro); })
        .finally(function () { carregando = false; });
}

carregarDashboard();
setInterval(carregarDashboard, 5000);