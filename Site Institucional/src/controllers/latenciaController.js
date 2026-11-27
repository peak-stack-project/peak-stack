var latenciaModel = require("../models/latenciaModel");

// Rótulos fixos do eixo X: 00:00h ... 23:00h
// Mesmo padrão do Captura_PeakStack.py (LIMITES_PADRAO "rede") quando a empresa não cadastrou limite
var LIMITE_ALERTA_PADRAO_MS = 100;

var HORAS = [];
for (var h = 0; h < 24; h++) HORAS.push(String(h).padStart(2, "0") + ":00h");

// Transforma [{hora: 3, media: 42.1}, ...] em um vetor de 24 posições (null onde não tem leitura)
function vetorPorHora(linhas, campo) {
    var vetor = new Array(24).fill(null);
    linhas.forEach(function (l) {
        var hora = Number(l.hora);
        if (hora >= 0 && hora < 24 && l[campo] != null) vetor[hora] = Number(l[campo]);
    });
    return vetor;
}

function resumir(latencia, pico) {
    var comValor = latencia.filter(function (v) { return v != null; });
    if (comValor.length === 0) return null;

    var soma = comValor.reduce(function (a, b) { return a + b; }, 0);
    var horaPico = 0;
    pico.forEach(function (v, i) { if (v != null && (pico[horaPico] == null || v > pico[horaPico])) horaPico = i; });

    return {
        media: Math.round(10 * soma / comValor.length) / 10,
        maior: pico[horaPico],
        horaPico: HORAS[horaPico]
    };
}

function latencia24h(req, res) {
    var idEmpresa = Number(req.params.idEmpresa);
    // ?maquina=ID é opcional (sem ele, mostra a média de todas as máquinas da empresa)
    var idMaquina = req.query.maquina ? Number(req.query.maquina) : null;

    if (!idEmpresa || isNaN(idEmpresa)) {
        return res.status(400).send("O idEmpresa está inválido!");
    }
    if (req.query.maquina && (!idMaquina || isNaN(idMaquina))) {
        return res.status(400).send("O id da máquina está inválido!");
    }

    Promise.all([
        latenciaModel.latenciaPorHora(idEmpresa, idMaquina),
        latenciaModel.requisicoesPorHora(idEmpresa, idMaquina),
        latenciaModel.limiteAlertaLatencia(idEmpresa)
    ]).then(function (r) {
        var limiteBanco = r[2].length ? r[2][0].limite : null;
        var limiteAlerta = limiteBanco != null ? Number(limiteBanco) : LIMITE_ALERTA_PADRAO_MS;

        var latencia = vetorPorHora(r[0], "media");
        var pico = vetorPorHora(r[0], "pico");

        res.json({
            rotulos: HORAS,
            latencia: latencia,
            picoLatencia: pico,
            requisicoes: vetorPorHora(r[1], "rps"),
            limiteAlerta: limiteAlerta,
            resumo: resumir(latencia, pico)
        });
    }).catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage || String(erro));
    });
}

module.exports = { latencia24h };