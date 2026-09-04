var metricaModel = require("../models/metricaModel");

function registrar_checkpoint(req, res) {
    // Extraindo as informações que vêm do Frontend (pelo fetch)
    var etapa = req.body.etapaServer;
    var idUsuario = req.body.idUsuarioServer; // Pode vir undefined se for um clique anônimo na Landing Page

    // 
    // A única variável que NÃO PODE ser undefined é a 'etapa'. O 'idUsuario' pode ser vazio.
    // Se a etapa for undefined, devolva um res.status(400). erro (400) que é erro de usuário


    if (etapa == undefined) {
        res.status(400).send("a etapa não foi registrada!");
    } else {

        metricaModel.registrar_checkpoint(etapa, idUsuario)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log("\nHouve um erro ao registrar a métrica! Erro: ", erro.sqlMessage);
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }


}

function obterDashboard(req, res) {
    metricaModel.obterDashboard()
        .then(function (resultado) {
            res.json(resultado);
        }).catch(function (erro) {
            console.log(erro);
            console.log("\nHouve um erro ao buscar os dados da dashboard! Erro: ", erro.sqlMessage);
            res.status(500).json(erro.sqlMessage);
        });
}

module.exports = {
    registrar_checkpoint,
    obterDashboard
};
