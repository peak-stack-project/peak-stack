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
 var instrucaoSql = `
select maquina.id as id, config_maq.id AS idConfigMaq, maquina.nome as nome, mac_address as mac, so.nome as sistema_operacional, nome_fantasia, concat(tipo, ' ', unidade_medida) as componente ,  status_config as 'status' from maquina join so on fk_so = so.id join empresa on fk_empresa = empresa.id
join config_maq on fk_maquina = maquina.id join componentes on componentes.id = fk_componentes join configuracao_comp on configuracao_comp.id = fk_configuracao_comp order by id desc;`;

  return database.executar(instrucaoSql);
}

function buscarMaquinaPorId(idConfigMaq) {
    var instrucaoSql = `select maquina.nome as nome, mac_address as mac, so.nome as sistema_operacional, nome_fantasia, status_config as 'status' from maquina join so on fk_so = so.id join empresa on fk_empresa = empresa.id 
join config_maq on fk_maquina = maquina.id join componentes on fk_componentes = componentes.id where config_maq.id = '${idConfigMaq}';`;

    return database.executar(instrucaoSql);
}

function atualizarMaquina(id, idConfigMaq, nome, mac, fk_so, status) {
      var instrucaoSql = `UPDATE maquina SET nome = '${nome}', mac_address = '${mac}', fk_so = '${fk_so}' WHERE id = '${id}';`;
      var instrucaoSql2 = `UPDATE config_maq SET status_config = '${status}' WHERE id = '${idConfigMaq}';`;

    return database.executar(instrucaoSql)
        .then(function () {
            return database.executar(instrucaoSql2);
        });
    }

module.exports = { cadastrarMaquina, cadastrarComponente, listar, listarMaquinas, buscarMaquinaPorId, atualizarMaquina };
