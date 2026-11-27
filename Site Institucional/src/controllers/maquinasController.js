var maquinasModel = require("../models/maquinasModel");

function atualizarMaquina(req, res) {
    var id = req.params.id;
    var idConfigMaq = req.params.idConfigMaq;
    var nome = req.body.nome;
    var mac = req.body.mac;
    var fk_so = req.body.fk_so;
    var status = req.body.status;

   

    maquinasModel.atualizarMaquina(id, idConfigMaq, nome, mac, fk_so, status)
        .then(
            function (resultado) {
                res.json(resultado);
            }
        ).catch(
            function (erro) {
                console.log(erro);
                console.log(
                    "\nHouve um erro ao atualizar a máquina: ",
                    erro.sqlMessage
                );
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function buscarMaquinaPorId(req, res) {
    var idConfigMaq = req.params.idConfigMaq;

    maquinasModel.buscarMaquinaPorId(idConfigMaq)
        .then(
            function (resultado) {
                if (resultado.length > 0) {
                    res.json(resultado[0]);
                } else {
                    res.status(404).send("Máquina não encontrada");
                }
            }
        ).catch(
            function (erro) {
                console.log(erro);
                console.log(
                    "\nHouve um erro ao buscar a máquina: ",
                    erro.sqlMessage
                );
                res.status(500).json(erro.sqlMessage);
            }
        );
}

function listarMaquinas(req, res){
    var fk = req.params.fk;
    maquinasModel.listarMaquinas(fk)
     .then(
            function (resultado) {
                res.json(resultado)
            }
        ).catch(
            function (erro) {
                console.log(erro);
                console.log(
                    "\nHouve um erro ",
                    erro.sqlMessage
                );
                res.status(500).json(erro.sqlMessage);
            }
        );
}

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
        adicionarComponenteSeNaoTiver(idMaquina, componente, status)
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

var STATUS_VALIDOS = ["Ativo", "Não Ativo", "Pendente"];

// Só cadastra o componente se a máquina ainda não tiver ele (senão a captura mediria duplicado).
// Se já tiver, devolve { affectedRows: 0 } sem inserir nada.
function adicionarComponenteSeNaoTiver(idMaquina, componente, status) {
    return maquinasModel.listarComponentesMaquina(idMaquina).then(function (atuais) {
        var jaTem = atuais.some(function (c) { return String(c.idComponente) == String(componente); });
        if (jaTem) return { affectedRows: 0 };
        return maquinasModel.cadastrarComponente(componente, idMaquina, status);
    });
}

// GET /maquinas/detalhe/:idMaquina -> dados da máquina + componentes dela
function detalheMaquina(req, res) {
    var idMaquina = Number(req.params.idMaquina);
    if (!idMaquina) return res.status(400).send("Id da máquina inválido!");

    Promise.all([
        maquinasModel.buscarDadosMaquina(idMaquina),
        maquinasModel.listarComponentesMaquina(idMaquina)
    ]).then(function (r) {
        if (r[0].length == 0) return res.status(404).send("Máquina não encontrada");
        var maquina = r[0][0];
        maquina.componentes = r[1];
        res.json(maquina);
    }).catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage);
    });
}

// PUT /maquinas/atualizarCompleta/:idMaquina
// body: { nome, mac, fk_so, componentes: [{ idConfigMaq, status }] }
function atualizarMaquinaCompleta(req, res) {
    var idMaquina = Number(req.params.idMaquina);
    var nome = req.body.nome;
    var mac = req.body.mac;
    var fk_so = req.body.fk_so;
    var componentes = req.body.componentes || [];
    var novoComponente = req.body.novoComponente;   // opcional: componente escolhido em "Adicionar componente"

    if (!idMaquina) return res.status(400).send("Id da máquina inválido!");
    if (!nome || !mac || !fk_so) return res.status(400).send("Preencha nome, MAC e sistema operacional!");
    var invalido = componentes.some(function (c) { return !Number(c.idConfigMaq) || STATUS_VALIDOS.indexOf(c.status) == -1; });
    if (invalido) return res.status(400).send("Status de componente inválido!");

    maquinasModel.atualizarDadosMaquina(idMaquina, nome, mac, fk_so)
        .then(function () {
            if (novoComponente) return adicionarComponenteSeNaoTiver(idMaquina, Number(novoComponente), "Ativo");
        })
        .then(function () {
            return Promise.all(componentes.map(function (c) {
                return maquinasModel.atualizarStatusComponente(idMaquina, Number(c.idConfigMaq), c.status);
            }));
        })
        .then(function () { res.json({ ok: true }); })
        .catch(function (erro) {
            console.log(erro);
            res.status(500).json(erro.sqlMessage);
        });
}

module.exports = {
  detalheMaquina,
  atualizarMaquinaCompleta,
  cadastrarMaquina,
  cadastrarComponente,
  listar,
  listarMaquinas,
  buscarMaquinaPorId,
  atualizarMaquina
};
