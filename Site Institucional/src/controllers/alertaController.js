var alertaModel = require("../models/alertaModel");

function listarAlerta(req, res) {
    var idEmpresa = req.params.idEmpresa;

    if (idEmpresa == undefined) {
        res.status(400).send("O idEmpresa está indefinido!");
        return;
    }

    alertaModel.listarAlerta(idEmpresa)
        .then(function (resultado) {
            if (resultado.length > 0) {
                res.status(200).json(resultado);
            } else {
                res.status(204).send("Nenhum alerta encontrado!");
            }
        })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage);
        });
}

function marcarCiente(req, res) {
    var idDiscretizada = req.params.idDiscretizada;
    var idEmpresa = req.body.idEmpresa;

    if (idDiscretizada == undefined) {
        res.status(400).send("O idDiscretizada está undefined!");
    } else if (idEmpresa == undefined) {
        res.status(400).send("O idEmpresa está undefined!");
    } else {
        alertaModel.marcarCiente(idDiscretizada, idEmpresa)
            .then(function (resultado) {
                res.json(resultado);
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).json(erro.sqlMessage);
            });
    }
}

module.exports = {
    listarAlerta, marcarCiente
};