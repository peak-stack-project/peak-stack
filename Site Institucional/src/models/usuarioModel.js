var database = require("../database/config")

function autenticar(email, senha) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ", email, senha)
    var instrucaoSql = `
        SELECT id, nome, email, fk_cargo, fk_empresa FROM usuario WHERE email = '${email}' AND senha = '${senha}';
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

// Coloque os mesmos parâmetros aqui. Vá para a var instrucaoSqldata_nascimento
function cadastrar(nome, email, senha, cargo, idempresa, data, nomeUsuario) {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function cadastrar():", nome, email, senha, cargo, idempresa, data, nomeUsuario);

    // Insira exatamente a query do banco aqui, lembrando da nomenclatura exata nos valores
    //  e na ordem de inserção dos dados.
    var instrucaoSql = `
        INSERT INTO usuario (nome, email, senha, fk_cargo, fk_empresa, updated_by, dt_nasc) VALUES ('${nome}', '${email}', '${senha}', '${cargo}', '${idempresa}', '${nomeUsuario}', '${data}');
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function listarUsuarios() {
    console.log("ACESSEI O USUARIO MODEL \n \n\t\t >> Se aqui der erro de 'Error: connect ECONNREFUSED',\n \t\t >> verifique suas credenciais de acesso ao banco\n \t\t >> e se o servidor de seu BD está rodando corretamente. \n\n function entrar(): ")
    var instrucaoSql = `
      select usuario.id as id, usuario.nome as nome, email, nome_fantasia as empresa, cargo.nome as cargo
from usuario join empresa on usuario.fk_empresa = empresa.id
join cargo on usuario.fk_cargo = cargo.id;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function buscarUsuarioPorId(id) {
    var instrucaoSql = `
        select id, nome, email, dt_nasc as data, fk_cargo from usuario where id = '${id}';
    `;

    return database.executar(instrucaoSql);
}

function atualizarUsuario(id, nome, email, data, cargo) {
    var instrucaoSql = `
        update usuario set nome = '${nome}', email = '${email}', dt_nasc = '${data}', fk_cargo = '${cargo}' WHERE id = '${id}';
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    autenticar,
    cadastrar,
    listarUsuarios,
    buscarUsuarioPorId,
    atualizarUsuario
};