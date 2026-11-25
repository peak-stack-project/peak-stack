// Dashboard "Previsão de saturação do disco".
// Busca /previsao/disco/:idEmpresa e desenha botões de servidor, KPIs, gráfico de regressão e ranking.
var idEmpresa = sessionStorage.FKEMPRESA_USUARIO;

var INTERVALO_ATUALIZACAO = 60000; // a base do cálculo é a média DIÁRIA, não precisa de 5 em 5 segundos
var CORES = { real: "#2b65ca", tendencia: "#0f1f3d", limite: "#ef4444", alerta: "#f59e0b" };

// como cada status aparece em cada parte da tela (classes que já existem no dashboard.css)
var VISUAL = {
    "Saudável":  { chip: "online",    linha: "online",  nivel: "nivel_ok",      valor: "sat_ok",      posicao: "cinza" },
    "Atenção":   { chip: "atencao",   linha: "alerta",  nivel: "nivel_alerta",  valor: "sat_atencao", posicao: "laranja" },
    "Crítico":   { chip: "offline",   linha: "offline", nivel: "nivel_critico", valor: "sat_critico", posicao: "vermelho" },
    "Sem dados": { chip: "sem_dados", linha: "",        nivel: "nivel_zero",    valor: "",            posicao: "cinza" }
};

var estado = { dias: 30, servidores: [], selecionado: null, grafico: null };

function $(id) { return document.getElementById(id); }

function esc(texto) {
    return String(texto).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
}

function fmt(numero, casas) {
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function dataBR(iso) { return iso.split("-").reverse().join("/"); }
function rotuloX(v) { return v === 0 ? "hoje" : v > 0 ? "+" + v + "d" : v + "d"; }
function visual(status) { return VISUAL[status] || VISUAL["Sem dados"]; }
function mostrarMensagem(texto) { $("mensagem").textContent = texto; }

// ---------------- busca ----------------
function carregar(atualizacaoAutomatica) {
    if (!idEmpresa) {
        mostrarMensagem("Não encontrei a empresa do usuário logado (FKEMPRESA_USUARIO). Faça login novamente.");
        return;
    }
    if (!atualizacaoAutomatica) mostrarMensagem("Calculando previsões...");

    fetch("/previsao/disco/" + idEmpresa + "?dias=" + estado.dias)
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.json();
        })
        .then(function (dados) {
            estado.servidores = dados.servidores;
            var aindaExiste = estado.servidores.some(function (s) { return s.id === estado.selecionado; });
            if (!aindaExiste) {
                // o primeiro da lista é o mais urgente
                estado.selecionado = estado.servidores.length ? estado.servidores[0].id : null;
            }
            mostrarMensagem(estado.servidores.length ? "" : "Nenhuma máquina com disco ativo cadastrada para esta empresa.");
            $("atualizado").textContent = "Regressão linear sobre a média diária de uso · atualizado às " +
                new Date(dados.geradoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            renderizar(!atualizacaoAutomatica);
        })
        .catch(function (erro) {
            console.log("Erro ao carregar a previsão:", erro);
            mostrarMensagem("Não foi possível carregar a previsão agora. Tente novamente em instantes.");
        });
}

// ---------------- desenho ----------------
function renderizar(animar) {
    var atual = estado.servidores.find(function (s) { return s.id === estado.selecionado; });
    renderBotoes();
    renderKpis(atual);
    renderGrafico(atual, animar);
    renderRanking();
}

function renderBotoes() {
    $("servidores").innerHTML = estado.servidores.map(function (s) {
        var ativo = s.id === estado.selecionado;
        return `
            <button type="button" class="sat_servidor" data-id="${s.id}" aria-pressed="${ativo}">
                <span class="sat_ponto ${visual(s.status).chip}"></span>
                <span>${esc(s.nome)}</span>
                <span class="sat_servidor_uso">${s.usoAtual !== null ? fmt(s.usoAtual, 0) + "%" : "--"}</span>
            </button>`;
    }).join("");
}

function renderKpis(s) {
    var v = visual(s ? s.status : "Sem dados");

    $("kpiUso").textContent = s && s.usoAtual !== null ? fmt(s.usoAtual, 0) + "%" : "--";

    if (s && s.crescimentoDiario !== null) {
        $("kpiCresc").textContent = (s.crescimentoDiario > 0 ? "+" : "") + fmt(s.crescimentoDiario, 1) + " p.p.";
        $("kpiR2").textContent = "R² = " + fmt(s.r2, 2);
    } else {
        $("kpiCresc").textContent = "--";
        $("kpiR2").textContent = "mínimo de 5 dias de leitura";
    }

    var dias = $("kpiDias");
    dias.className = v.valor;
    if (!s || s.status === "Sem dados") {
        dias.textContent = "--";
        $("kpiData").textContent = "\u00a0";
    } else if (s.diasAteSaturar === null) {
        dias.textContent = "Estável";
        $("kpiData").textContent = "sem tendência de crescimento";
    } else {
        dias.textContent = s.diasAteSaturar + " dias";
        $("kpiData").textContent = "estimado: " + dataBR(s.dataSaturacao);
    }

    var chip = $("kpiStatus");
    chip.className = "maq_status " + v.chip;
    chip.textContent = s ? s.status : "--";
    $("kpiLimite").textContent = "limite de alerta: " + (s ? s.limites.alerta : 80) + "%";
}

function renderGrafico(s, animar) {
    if (estado.grafico) { estado.grafico.destroy(); estado.grafico = null; }

    var semGrafico = !s || !s.serieReal.length;
    $("graficoVazio").hidden = !semGrafico;
    $("graficoRegressao").parentElement.hidden = semGrafico;

    $("graficoSub").innerHTML = s
        ? esc(s.nome) + ' · <a class="sat_link" style="margin:0" href="./visao_especifica.html?id=' + s.id + '">ver detalhe da máquina</a>'
        : "Selecione um servidor";
    if (semGrafico) return;

    var xMin = s.xMin, xMax = s.xFim;
    var menorUso = Math.min.apply(null, s.serieReal.map(function (p) { return p.y; }));
    var yMin = Math.max(0, Math.floor((menorUso - 5) / 10) * 10);
    function linhaFixa(y) { return [{ x: xMin, y: y }, { x: xMax, y: y }]; }

    estado.grafico = new Chart($("graficoRegressao"), {
        type: "line",
        data: {
            datasets: [
                { label: "Uso real (média diária)", data: s.serieReal, borderColor: CORES.real,
                  borderWidth: 2.5, pointRadius: 0, tension: 0.25 },
                { label: "Regressão linear", data: s.tendencia, borderColor: CORES.tendencia,
                  borderWidth: 2, borderDash: [6, 5], pointRadius: 0 },
                { label: "Limite 100%", data: linhaFixa(s.limites.saturacao), borderColor: CORES.limite,
                  borderWidth: 1.5, pointRadius: 0 },
                { label: "Alerta " + s.limites.alerta + "%", data: linhaFixa(s.limites.alerta), borderColor: CORES.alerta,
                  borderWidth: 1.5, borderDash: [2, 3], pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: animar ? undefined : false,
            interaction: { mode: "nearest", axis: "x", intersect: false },
            plugins: {
                legend: { display: false }, // a legenda é o .det_legenda do HTML
                tooltip: {
                    callbacks: {
                        title: function (itens) { return rotuloX(Math.round(itens[0].parsed.x)); },
                        label: function (ctx) { return " " + ctx.dataset.label + ": " + fmt(ctx.parsed.y, 1) + "%"; }
                    }
                }
            },
            scales: {
                x: { type: "linear", min: xMin, max: xMax, grid: { display: false },
                     ticks: { includeBounds: false, font: { family: "Inter", size: 11 }, color: "#9aa3b8",
                              callback: function (v) { return rotuloX(v); } } },
                y: { min: yMin, max: 105, grid: { color: "#eef1f6" },
                     ticks: { font: { family: "Inter", size: 11 }, color: "#9aa3b8",
                              callback: function (v) { return v + "%"; } } }
            }
        }
    });
}

function renderRanking() {
    $("ranking").innerHTML = estado.servidores.map(function (s, i) {
        var v = visual(s.status);
        var uso = s.usoAtual;
        var dias = s.status === "Sem dados" ? "--" : s.diasAteSaturar === null ? "Estável" : s.diasAteSaturar;
        var cresc = s.crescimentoDiario === null ? "--"
            : (s.crescimentoDiario > 0 ? "+" : "") + fmt(s.crescimentoDiario, 1) + " p.p.";

        return `
            <div class="linha_tabela sat_linha ${s.id === estado.selecionado ? "sat_selecionada" : ""}" data-id="${s.id}">
                <span class="posicao ${v.posicao}">${i + 1}</span>
                <span class="sat_nome">${esc(s.nome)}</span>
                <span class="maq_medidor_celula ${v.nivel}">
                    <span class="maq_medidor"><span class="maq_medidor_barra" style="width:${uso !== null ? Math.min(uso, 100) : 0}%"></span></span>
                    <span class="maq_pct">${uso !== null ? fmt(uso, 0) + "%" : "--"}</span>
                </span>
                <span>${cresc}</span>
                <span>${dias}</span>
                <span class="status ${v.linha}">${s.status}</span>
            </div>`;
    }).join("");
}

function selecionar(id) {
    estado.selecionado = id;
    renderizar(true);
}

// ---------------- eventos (delegação: os elementos são recriados a cada desenho) ----------------
$("servidores").addEventListener("click", function (e) {
    var botao = e.target.closest("button[data-id]");
    if (botao) selecionar(Number(botao.dataset.id));
});

$("ranking").addEventListener("click", function (e) {
    var linha = e.target.closest("[data-id]");
    if (linha) selecionar(Number(linha.dataset.id));
});

$("periodos").addEventListener("click", function (e) {
    var botao = e.target.closest("button[data-dias]");
    if (!botao) return;
    estado.dias = Number(botao.dataset.dias);
    document.querySelectorAll("#periodos button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === botao));
    });
    carregar(false);
});

carregar(false);
setInterval(function () { carregar(true); }, INTERVALO_ATUALIZACAO);
