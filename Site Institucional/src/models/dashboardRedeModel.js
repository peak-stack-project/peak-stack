var database = require("../database/config")

function conexoes() {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql =  `
    SELECT
    `
}