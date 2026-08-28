var usuarioModel = require("../models/usuarioModel");

function criptografarSenha(senha) {
    let senhaCriptografada = "";

    for (let i = 0; i < senha.length; i++) {
        let codigo = senha.charCodeAt(i);
        let codigoAlterado = codigo + 4;
        let hexadecimal = codigoAlterado.toString(16);

        senhaCriptografada += hexadecimal;
    }

    return senhaCriptografada;
}


function autenticar(req, res) {
    var email = req.body.emailServer;
    var senha = criptografarSenha(req.body.senhaServer);


    if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está indefinida!");
    } else {

        usuarioModel.autenticar(email, senha)
            .then(
                function (resultadoAutenticar) {
                    console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
                    console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`); // transforma JSON em String

                    if (resultadoAutenticar.length == 1) {
                        console.log(resultadoAutenticar);

                        res.json({
                            id: resultadoAutenticar[0].id,
                            email: resultadoAutenticar[0].email,
                            nome: resultadoAutenticar[0].nome,
                            tipo: resultadoAutenticar[0].tipo,
                            data_nascimento: resultadoAutenticar[0].data_nascimento,
                            genero: resultadoAutenticar[0].genero
                        });
                    } else if (resultadoAutenticar.length == 0) {
                        res.status(403).send("Email e/ou senha inválido(s)");
                    } else {
                        res.status(403).send("Mais de um usuário com o mesmo login e senha!");
                    }
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log("\nHouve um erro ao realizar o login! Erro: ", erro.sqlMessage);
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }

}

function cadastrar(req, res) {
    // Crie uma variável que vá recuperar os valores do arquivo cadastro.html
    var nome = req.body.nomeServer;
    var email = req.body.emailServer;
    var senha = criptografarSenha(req.body.senhaServer);
    var data_nascimento = req.body.data_nascimentoServer;
    var genero = req.body.generoServer;
    var tipo = req.body.tipoServer
    // não coloquei o tipo pois ele é definido pela senha e usuário no login: 'admin'

    // Faça as validações dos valores
    if (nome == undefined) {
        res.status(400).send("Seu nome está undefined!");
    } else if (email == undefined) {
        res.status(400).send("Seu email está undefined!");
    } else if (senha == undefined) {
        res.status(400).send("Sua senha está undefined!");
    } else if (data_nascimento == undefined) {
        res.status(400).send("Sua data de nascimento está undefined!");
    } else if (genero == undefined) {
        res.status(400).send("Seu genero está undefined!");
    } else {

        // Passe os valores como parâmetro e vá para o arquivo usuarioModel.js
        usuarioModel.cadastrar(nome, email, senha, data_nascimento, genero, tipo)
            .then(
                function (resultado) {
                    res.json(resultado);
                }
            ).catch(
                function (erro) {
                    console.log(erro);
                    console.log(
                        "\nHouve um erro ao realizar o cadastro! Erro: ",
                        erro.sqlMessage
                    );
                    res.status(500).json(erro.sqlMessage);
                }
            );
    }
}

module.exports = {
    autenticar,
    cadastrar
}