const { autenticar } = require("../controllers/maquinasController");
var database = require("../database/config");

function cadastrarMaquina(nome,mac, nomeUsuario, so, idEmpresa) {
  var instrucaoSql =  `INSERT INTO maquina (nome, mac_address, updated_by ,fk_so, fk_empresa) VALUES ('${nome}','${mac}', '${nomeUsuario}','${so}', '${idEmpresa}')`;

  return database.executar(instrucaoSql);
}

function cadastrarComponente( componente,idMaquina, status) {
  var instrucaoSql = `INSERT INTO config_maq (fk_componentes, fk_maquina, status_config) VALUES ('${componente}','${idMaquina}', '${status}')`;

  return database.executar(instrucaoSql);
}

function listar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT id FROM maquina ORDER BY id DESC LIMIT 1;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarMaquinas (req, res){
 var instrucaoSql = `select maquina.nome as nome, mac_address as mac, so.nome as sistema_operacional, nome_fantasia, status_config as 'status' from maquina join so on fk_so = so.id join empresa on fk_empresa = empresa.id
join config_maq on fk_maquina = maquina.id;`;

  return database.executar(instrucaoSql);
}

module.exports = { cadastrarMaquina, cadastrarComponente, listar, listarMaquinas };
