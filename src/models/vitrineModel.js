var database = require("../database/config");

// Parâmetros recebidos do Controller
function avaliar( idUsuario, interesse, conhecia, fk_marca) {

    // Inserção dos dados na tabela vitrine_marcas
    var instrucaoSql = `
        INSERT INTO vitrine_marcas (fk_usuario, grau_interesse, ja_conhecia,fk_marca)
        VALUES (${idUsuario}, ${interesse}, '${conhecia}', '${fk_marca}');
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);

    return database.executar(instrucaoSql);
}

module.exports = {
    avaliar
};
