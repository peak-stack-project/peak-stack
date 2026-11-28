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

// Uma linha por máquina, com quantos componentes ela tem e quantos estão ativos
function listarMaquinas (fk){
 var instrucaoSql = `
select maquina.id as id, maquina.nome as nome, mac_address as mac, so.nome as sistema_operacional, nome_fantasia,
       count(config_maq.id) as totalComponentes,
       coalesce(sum(config_maq.status_config = 'Ativo'), 0) as componentesAtivos
from maquina join so on fk_so = so.id join empresa on fk_empresa = empresa.id
left join config_maq on config_maq.fk_maquina = maquina.id
where empresa.id = '${fk}'
group by maquina.id, maquina.nome, mac_address, so.nome, nome_fantasia
order by maquina.id desc;`;

  return database.executar(instrucaoSql);
}

function buscarMaquinaPorId(idConfigMaq) {
    var instrucaoSql = `select maquina.nome as nome, mac_address as mac, maquina.fk_so as fk_so, so.nome as sistema_operacional, nome_fantasia, status_config as 'status' from maquina join so on fk_so = so.id join empresa on fk_empresa = empresa.id 
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

// ----- edição da máquina com os componentes dela -----

// Dados da máquina pelo id da MÁQUINA
function buscarDadosMaquina(idMaquina) {
    var instrucaoSql = `select maquina.id, maquina.nome, mac_address as mac, fk_so, so.nome as sistema_operacional
        from maquina join so on fk_so = so.id where maquina.id = '${idMaquina}';`;
    return database.executar(instrucaoSql);
}

// Componentes (config_maq) de uma máquina
function listarComponentesMaquina(idMaquina) {
    var instrucaoSql = `select config_maq.id as idConfigMaq, config_maq.fk_componentes as idComponente,
            componentes.nome as nomeComponente, tipo, unidade_medida, status_config as status
        from config_maq
        join componentes on componentes.id = config_maq.fk_componentes
        join configuracao_comp on configuracao_comp.id = componentes.fk_configuracao_comp
        where config_maq.fk_maquina = '${idMaquina}'
        order by config_maq.fk_componentes;`;
    return database.executar(instrucaoSql);
}

// Só os dados da máquina (nome, MAC e SO)
function atualizarDadosMaquina(id, nome, mac, fk_so) {
    var instrucaoSql = `UPDATE maquina SET nome = '${nome}', mac_address = '${mac}', fk_so = '${fk_so}' WHERE id = '${id}';`;
    return database.executar(instrucaoSql);
}

// Status de um componente da máquina (confere que o config_maq é dessa máquina)
function atualizarStatusComponente(idMaquina, idConfigMaq, status) {
    var instrucaoSql = `UPDATE config_maq SET status_config = '${status}' WHERE id = '${idConfigMaq}' AND fk_maquina = '${idMaquina}';`;
    return database.executar(instrucaoSql);
}

module.exports = { cadastrarMaquina, cadastrarComponente, listar, listarMaquinas, buscarMaquinaPorId, atualizarMaquina,
    buscarDadosMaquina, listarComponentesMaquina, atualizarDadosMaquina, atualizarStatusComponente };