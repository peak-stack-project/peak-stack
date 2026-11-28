var { regressaoLinear } = require("./regressaoLinear");

// ---- Regras de negócio da previsão (ajuste aqui) ----
var LIMITE_SATURACAO = 100;    // disco cheio
var LIMITE_ALERTA = 80;        // linha de alerta do gráfico
var USO_CRITICO = 95;          // disco praticamente cheio já é Crítico, independente da tendência
var DIAS_CRITICO = 15;         // saturando em até 15 dias = Crítico
var DIAS_ATENCAO = 60;         // saturando em até 60 dias = Atenção
var MIN_PONTOS = 5;            // mínimo de dias com leitura para ajustar a reta
var CRESCIMENTO_MINIMO = 0.01; // abaixo disso (p.p./dia) consideramos o uso estável
var MS_DIA = 86400000;

function hojeUTC() {
    var d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

function paraISO(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

function arredondar(v, casas) {
    var f = Math.pow(10, casas === undefined ? 2 : casas);
    return Math.round(v * f) / f;
}

// A previsão classifica pelo TEMPO até saturar (diferente do status da captura, que olha o uso atual).
function classificar(usoAtual, dias) {
    if (usoAtual >= USO_CRITICO || (dias !== null && dias <= DIAS_CRITICO)) return "Crítico";
    if (usoAtual >= LIMITE_ALERTA || (dias !== null && dias <= DIAS_ATENCAO)) return "Atenção";
    return "Saudável";
}

// servidor: { id, nome, linhas: [{ dia: 'YYYY-MM-DD', uso: Number }] } ordenado por dia
function analisarServidor(servidor, diasPeriodo) {
    var hoje = hojeUTC();

    // x = distância em dias até hoje (usa a data real, então dias sem leitura não distorcem a reta)
    var reais = servidor.linhas.map(function (l) {
        var p = l.dia.split("-").map(Number);
        return { x: Math.round((Date.UTC(p[0], p[1] - 1, p[2]) - hoje) / MS_DIA), y: Number(l.uso) };
    });

    var semDados = {
        id: servidor.id,
        nome: servidor.nome,
        usoAtual: reais.length ? arredondar(reais[reais.length - 1].y, 1) : null,
        crescimentoDiario: null,
        r2: null,
        diasAteSaturar: null,
        dataSaturacao: null,
        status: "Sem dados",
        serieReal: [],
        tendencia: [],
        xMin: -(diasPeriodo - 1),
        xFim: 30,
        limites: { saturacao: LIMITE_SATURACAO, alerta: LIMITE_ALERTA }
    };

    var reg = reais.length >= MIN_PONTOS ? regressaoLinear(reais) : null;
    if (!reg) return semDados;

    var usoAtual = reais[reais.length - 1].y;
    var crescimento = reg.a;

    // dias até saturar: resolve a·x + b = 100  →  x = (100 - b) / a
    var dias = null;
    if (crescimento >= CRESCIMENTO_MINIMO) {
        dias = Math.max(0, Math.ceil((LIMITE_SATURACAO - reg.b) / crescimento));
    }
    var dataSaturacao = dias !== null ? paraISO(hoje + dias * MS_DIA) : null;

    var xMin = Math.min.apply(null, reais.map(function (p) { return p.x; }));
    var xFim = dias !== null ? Math.min(Math.max(dias + 7, 30), 120) : 30;

    return {
        id: servidor.id,
        nome: servidor.nome,
        usoAtual: arredondar(usoAtual, 1),
        crescimentoDiario: arredondar(crescimento, 2),
        r2: arredondar(reg.r2, 2),
        diasAteSaturar: dias,
        dataSaturacao: dataSaturacao,
        status: classificar(usoAtual, dias),
        serieReal: reais.map(function (p) { return { x: p.x, y: arredondar(p.y, 2) }; }),
        // uma reta só precisa de 2 pontos
        tendencia: [
            { x: xMin, y: arredondar(reg.a * xMin + reg.b, 2) },
            { x: xFim, y: arredondar(reg.a * xFim + reg.b, 2) }
        ],
        xMin: xMin,
        xFim: xFim,
        limites: { saturacao: LIMITE_SATURACAO, alerta: LIMITE_ALERTA }
    };
}

// Menos dias restantes = mais urgente. Estável vem depois; sem dados por último.
function ordenarPorUrgencia(servidores) {
    function peso(s) { return s.status === "Sem dados" ? 2 : s.diasAteSaturar === null ? 1 : 0; }
    return servidores.slice().sort(function (a, b) {
        if (peso(a) !== peso(b)) return peso(a) - peso(b);
        if (peso(a) === 0 && a.diasAteSaturar !== b.diasAteSaturar) return a.diasAteSaturar - b.diasAteSaturar;
        return (b.usoAtual || 0) - (a.usoAtual || 0);
    });
}

module.exports = { analisarServidor, ordenarPorUrgencia };
