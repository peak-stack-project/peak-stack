var vitrineModel = require("../models/vitrineModel");

function avaliar(req, res) {

    var idUsuario = req.body.idUsuarioServer;
    var grau_interesse = req.body.interesseServer;
    var ja_conhecia = req.body.conhecimentoServer;
    var fk_marca = req.body.marcaServer;


    // validação para não receber valores vazios ou undefined

     if (idUsuario == undefined) {
        res.status(400).send("Seu ID está indefinido!");
    } else if (grau_interesse == undefined) {
        res.status(400).send("Seu grau de interesse está indefinido!");
    } else if (ja_conhecia == undefined) {
        res.status(400).send("Você não informou se já conhecia a marca!");
    } else if (fk_marca == undefined) {
        res.status(400).send("Você não informou se já conhecia a marca!");
    }else {
        vitrineModel.avaliar(idUsuario, grau_interesse, ja_conhecia, fk_marca)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao registrar a avaliação!",
                        erro.sqlMessage
                    );
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }


}

module.exports = {
    avaliar
};
