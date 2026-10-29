var maquinasModel = require("../models/maquinasModel");

function cadastrarMaquina(req, res) {
    // Crie uma variável que vá recuperar os valores do arquivo cadastro.html
    var nome = req.body.nomeServer;
    var mac = req.body.macServer;
    var so = req.body.soServer;
    var idEmpresa = req.body.idEmpresaServer;
    var nomeUsuario = req.body.nomeUsuarioServer;
   
        // Passe os valores como parâmetro e vá para o arquivo usuarioModel.js
        maquinasModel.cadastrarMaquina(nome, mac, nomeUsuario, so, idEmpresa)
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

function cadastrarComponente(req, res) {
    // Crie uma variável que vá recuperar os valores do arquivo cadastro.html
    var status = req.body.statusServer;
    var componente = req.body.commponenteServer;
    var idMaquina = req.body.idMaquinaServer;
   
        // Passe os valores como parâmetro e vá para o arquivo usuarioModel.js
        maquinasModel.cadastrarComponente(componente, idMaquina, status)
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

function listar(req, res) {
  var email = req.body.emailServer;
     var senha = req.body.senhaServer;
 
 
     if (email == undefined) {
         res.status(400).send("Seu email está undefined!");
     } else if (senha == undefined) {
         res.status(400).send("Sua senha está indefinida!");
     } else {
 
         maquinasModel.listar(email, senha)
             .then(
                 function (resultadoAutenticar) {
                     console.log(`\nResultados encontrados: ${resultadoAutenticar.length}`);
                     console.log(`Resultados: ${JSON.stringify(resultadoAutenticar)}`); // transforma JSON em String
 
                     if (resultadoAutenticar.length == 1) {
                         console.log(resultadoAutenticar);
                         res.json({
                             id: resultadoAutenticar[0].id,
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

module.exports = {
  cadastrarMaquina,
  cadastrarComponente,
  listar
};
