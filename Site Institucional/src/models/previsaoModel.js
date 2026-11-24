var database = require("../database/config");

// Média diária (%) de uso de disco de cada máquina da empresa nos últimos `dias` dias.
// Usa só componentes de Disco em % com status_config = 'Ativo' (mesmo critério do dashboardModel).
// LEFT JOIN em leitura: máquina sem leitura no período continua aparecendo (dia = NULL).
function buscarMediaDiariaDisco(idEmpresa, dias) {
    var instrucaoSql = `
        SELECT m.id AS idMaquina,
               m.nome AS nomeMaquina,
               DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d') AS dia,
               ROUND(AVG(l.valor), 2) AS uso
        FROM maquina m
        JOIN config_maq cm ON cm.fk_maquina = m.id AND cm.status_config = 'Ativo'
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                                 AND cc.tipo = 'Disco' AND cc.unidade_medida = '%'
        LEFT JOIN leitura l ON l.fk_config_maq = cm.id
                           AND l.dt_hr_leitura >= DATE_SUB(CURDATE(), INTERVAL ${Number(dias) - 1} DAY)
        WHERE m.fk_empresa = ${Number(idEmpresa)}
        GROUP BY m.id, m.nome, dia
        ORDER BY m.nome, dia;
    `;
    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

module.exports = { buscarMediaDiariaDisco };
