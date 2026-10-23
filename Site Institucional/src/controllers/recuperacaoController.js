
var recuperacaoModel = require("../models/recuperacaoModel");

function criptografarSenha(senha) {
    var senhaCriptografada = "";

    for (var i = 0; i < senha.length; i++) {
        var codigo = senha.charCodeAt(i);
        var codigoAlterado = codigo + 4;
        var hexadecimal = codigoAlterado.toString(16);

        senhaCriptografada += hexadecimal;
    }

    return senhaCriptografada;
}


function verificarEmail(req, res) {
    var email = req.body.emailServer;

    if (email == undefined || email.trim() == "") {
        res.status(400).send("Seu email está inválido!");
    } else {
        recuperacaoModel.buscarUsuarioPorEmail(email)
            .then(function (resultado) {
                if (resultado.length == 1) {
                    res.json({
                        mensagem: "E-mail encontrado!"
                    });
                } else {
                    res.status(404).send("E-mail não encontrado!");
                }
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).send("Erro ao verificar o e-mail.");
            });
    }
}


function verificarNascimento(req, res) {
    var email = req.body.emailServer;
    var dataNascimento = req.body.dataNascimentoServer;

    if (email == undefined || email.trim() == "") {
        res.status(400).send("Seu email está inválido!");
    } else if (dataNascimento == undefined || dataNascimento == "") {
        res.status(400).send("Informe sua data de nascimento!");
    } else {
        recuperacaoModel.verificarNascimento(email, dataNascimento)
            .then(function (resultado) {
                if (resultado.length == 1) {
                    res.json({
                        mensagem: "Data de nascimento confirmada!"
                    });
                } else {
                    res.status(403).send("Data de nascimento incorreta!");
                }
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).send("Erro ao verificar a data de nascimento.");
            });
    }
}


function redefinirSenha(req, res) {
    var email = req.body.emailServer;
    var dataNascimento = req.body.dataNascimentoServer;
    var senha = req.body.senhaServer;
    var confirmarSenha = req.body.confirmarSenhaServer;

    if (email == undefined || email.trim() == "") {
        res.status(400).send("Seu email está inválido!");
    } else if (dataNascimento == undefined || dataNascimento == "") {
        res.status(400).send("Informe sua data de nascimento!");
    } else if (senha == undefined || senha == "") {
        res.status(400).send("Informe a nova senha!");
    } else if (confirmarSenha == undefined || confirmarSenha == "") {
        res.status(400).send("Confirme sua nova senha!");
    } else if (senha !== confirmarSenha) {
        res.status(400).send("As senhas não coincidem!");
    } else if (senha.length < 8) {
        res.status(400).send("A senha deve ter pelo menos 8 caracteres!");
    } else {

        recuperacaoModel.verificarNascimento(email, dataNascimento)
            .then(function (resultado) {
                if (resultado.length == 1) {
                    var idUsuario = resultado[0].id;
                    var senhaCriptografada = criptografarSenha(senha);

                    recuperacaoModel.redefinirSenha(
                        idUsuario,
                        senhaCriptografada
                    )
                        .then(function (resultadoAtualizacao) {
                            res.json({
                                mensagem: "Senha redefinida com sucesso!"
                            });
                        })
                        .catch(function (erro) {
                            console.log(erro);
                            res.status(500).send("Erro ao atualizar a senha.");
                        });
                } else {
                    res.status(403).send(
                        "E-mail ou data de nascimento incorretos!"
                    );
                }
            })
            .catch(function (erro) {
                console.log(erro);
                res.status(500).send("Erro ao confirmar os dados.");
            });
    }
}

module.exports = {
    verificarEmail,
    verificarNascimento,
    redefinirSenha
};
