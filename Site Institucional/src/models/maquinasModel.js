const { autenticar } = require("../controllers/maquinasController");
var database = require("../database/config");

function cadastrarMaquina(nome,mac, nomeUsuario, so, idEmpresa) {
  var instrucaoSql =  `INSERT INTO maquina (nome, mac_address, updated_by ,fk_so, fk_empresa) VALUES ('${nome}','${mac}', '${nomeUsuario}','${so}', '${idEmpresa}')`;

  return database.executar(instrucaoSql);
}

function cadastrarComponente(nome,razaoSocial, cnpj) {
  var instrucaoSql = `INSERT INTO empresa (nome_fantasia,razao_social, cnpj) VALUES ('${nome}','${razaoSocial}', '${cnpj}')`;

  return database.executar(instrucaoSql);
}

function listar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT id FROM empresa ORDER BY id DESC LIMIT 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = { cadastrarMaquina, cadastrarComponente, listar };
