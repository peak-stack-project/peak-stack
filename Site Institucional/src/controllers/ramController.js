var ramModel = require("../models/ramModel");

function responder(promessa, res) {
    promessa
        .then(resultado => res.status(200).json(resultado))
        .catch(erro => res.status(500).json(erro.sqlMessage || erro));
}

function listarServidores(req, res) {
    responder(ramModel.listarServidores(req.params.idEmpresa), res);
}

function buscarKPIs(req, res) {
    ramModel.buscarKPIs(req.params.idMaquina)
        .then(([dados]) => {
            if (!dados) return res.status(204).send();
            const ramAtualPct = Number(dados.ramAtualPct);
            const ramTotalGb = Number(dados.ramTotalGb);
            res.status(200).json({
                ramAtualPct,
                ramAtualGb: Number(((ramAtualPct / 100) * ramTotalGb).toFixed(1)),
                ramTotalGb,
                pico24hPct: Number(dados.pico24hPct),
                pico24hHorario: dados.pico24hHorario,
                tempoForaNormalPct: Number(dados.tempoForaNormalPct)
            });
        })
        .catch(erro => res.status(500).json(erro.sqlMessage || erro));
}

function buscarHistoricoRam(req, res) {
    responder(ramModel.buscarHistoricoRam(req.params.idMaquina, req.query.periodo || "24h"), res);
}

function buscarSerieVazamento(req, res) {
    responder(ramModel.buscarSerieVazamento(req.params.idMaquina), res);
}

function buscarDispersaoRede(req, res) {
    responder(ramModel.buscarDispersaoRede(req.params.idMaquina), res);
}

module.exports = {
    listarServidores,
    buscarKPIs,
    buscarHistoricoRam,
    buscarSerieVazamento,
    buscarDispersaoRede
};