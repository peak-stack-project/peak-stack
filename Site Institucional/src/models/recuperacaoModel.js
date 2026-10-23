
var database = require("../database/config");

function buscarUsuarioPorEmail(email) {
    var instrucaoSql = `
        SELECT id, email
        FROM usuario
        WHERE email = '${email}'
    `;

    return database.executar(instrucaoSql);
}

function verificarNascimento(email, dataNascimento) {
    var instrucaoSql = `
        SELECT id, email
        FROM usuario
        WHERE email = '${email}'
        AND dt_nasc = '${dataNascimento}'
    `;

    return database.executar(instrucaoSql);
}

function redefinirSenha(id, senha) {
    var instrucaoSql = `
        UPDATE usuario
        SET senha = '${senha}'
        WHERE id = ${id}
    `;

    return database.executar(instrucaoSql);
}

module.exports = {
    buscarUsuarioPorEmail,
    verificarNascimento,
    redefinirSenha
};
