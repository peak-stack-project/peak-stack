var database = require("../database/config");

function listarAlerta(idEmpresa) {
   var instrucaoSql = `
        SELECT 
            d.id AS id_discretizada,
            d.situacao,
            d.descricao,
            d.consciente,
            l.valor AS valor_leitura,
            l.dt_hr_leitura,
            m.nome AS nome_maquina,
            e.id AS id_empresa,
            e.nome_fantasia AS empresa
        FROM discretizada d
        INNER JOIN leitura l ON d.fk_leitura = l.id
        INNER JOIN config_maq cm ON l.fk_config_maq = cm.id
        INNER JOIN maquina m ON cm.fk_maquina = m.id
        INNER JOIN empresa e ON m.fk_empresa = e.id
        WHERE e.id = ${idEmpresa}
          AND (d.consciente = 0 OR d.consciente IS NULL)
        ORDER BY l.dt_hr_leitura DESC;
    `;

    return database.executar(instrucaoSql);
}


function marcarCiente(idEmpresa) {
    var instrucaoSql = `
        UPDATE discretizada d
        INNER JOIN leitura l ON d.fk_leitura = l.id
        INNER JOIN config_maq cm ON l.fk_config_maq = cm.id
        INNER JOIN maquina m ON cm.fk_maquina = m.id
        SET d.consciente = 1
        WHERE m.fk_empresa = ${idEmpresa}
          AND (d.consciente = 0 OR d.consciente IS NULL);
    `;

    return database.executar(instrucaoSql);
}

module.exports = { 
    listarAlerta, marcarCiente
};