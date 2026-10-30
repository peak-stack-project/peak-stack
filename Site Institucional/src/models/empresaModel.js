const { autenticar } = require("../controllers/empresaController");
var database = require("../database/config");

function buscarPorId(id) {
  var instrucaoSql = `SELECT * FROM empresa WHERE id = '${id}'`;

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

function buscarPorCnpj(cnpj) {
  var instrucaoSql = `SELECT * FROM empresa WHERE cnpj = '${cnpj}'`;

  return database.executar(instrucaoSql);
}

function cadastrar(nome, razaoSocial, cnpj) {
  var instrucaoSql = `INSERT INTO empresa (nome_fantasia,razao_social, cnpj) VALUES ('${nome}','${razaoSocial}', '${cnpj}')`;

  return database.executar(instrucaoSql);


}

function listarEmpresas(req, res) {
  var instrucaoSql = `
  SELECT 
    e.*,
    u.*
    FROM empresa e
    LEFT JOIN usuario u
    ON u.fk_empresa = e.id
    AND u.created_at = (
        SELECT MIN(u2.created_at)
        FROM usuario u2
        WHERE u2.fk_empresa = e.id
    );`

  return database.executar(instrucaoSql);

}


function atualizar( nomeFantasia, razaoSocial, cnpj, id) {
  var instrucaoSql = `UPDATE empresa 
                      SET nome_fantasia = '${nomeFantasia}', 
                      razao_social = '${razaoSocial}', 
                      cnpj = '${cnpj}' 
                      WHERE id = '${id}'`

  return database.executar(instrucaoSql);

}


module.exports = { buscarPorCnpj, buscarPorId, cadastrar, listarEmpresas, listar, atualizar};
