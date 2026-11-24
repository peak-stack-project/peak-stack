var previsaoModel = require("../models/previsaoModel");
var { analisarServidor, ordenarPorUrgencia } = require("../routes/saturacaoService");

var PERIODOS_VALIDOS = [7, 15, 30, 60, 90];

function listarDisco(req, res) {
    var idEmpresa = parseInt(req.params.idEmpresa, 10);
    var dias = parseInt(req.query.dias, 10);

    if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) {
        return res.status(400).json("O idEmpresa está indefinido ou é inválido!");
    }
    if (PERIODOS_VALIDOS.indexOf(dias) === -1) dias = 30;

    previsaoModel.buscarMediaDiariaDisco(idEmpresa, dias)
        .then(function (linhas) {
            // agrupa as linhas (uma por máquina/dia) por máquina
            var porMaquina = {};
            var ordem = [];
            linhas.forEach(function (l) {
                if (!porMaquina[l.idMaquina]) {
                    porMaquina[l.idMaquina] = { id: l.idMaquina, nome: l.nomeMaquina, linhas: [] };
                    ordem.push(l.idMaquina);
                }
                if (l.dia) porMaquina[l.idMaquina].linhas.push({ dia: l.dia, uso: l.uso });
            });

            var servidores = ordenarPorUrgencia(ordem.map(function (id) {
                return analisarServidor(porMaquina[id], dias);
            }));

            res.status(200).json({ periodo: dias, geradoEm: new Date().toISOString(), servidores: servidores });
        })
        .catch(function (erro) {
            console.log("Erro ao calcular a previsão de saturação:", erro.sqlMessage || erro);
            res.status(500).json(erro.sqlMessage || String(erro));
        });
}

module.exports = { listarDisco };
