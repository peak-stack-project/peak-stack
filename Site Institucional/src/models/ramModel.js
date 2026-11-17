var database = require("../database/config");

const JOIN_LEITURA = `
    FROM leitura l
    INNER JOIN config_maq cm ON cm.id = l.fk_config_maq
    INNER JOIN componentes c ON c.id = cm.fk_componentes
    INNER JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
`;

function listarServidores(idEmpresa) {
    return database.executar(`
        SELECT id AS idMaquina, nome, mac_address AS macAddress
        FROM maquina
        WHERE fk_empresa = ${idEmpresa}
        ORDER BY nome ASC;
    `);
}

function buscarKPIs(idMaquina) {
    return database.executar(`
        SELECT
            COALESCE((SELECT l.valor ${JOIN_LEITURA} WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%' ORDER BY l.dt_hr_leitura DESC LIMIT 1), 0) AS ramAtualPct,
            COALESCE((SELECT l.valor ${JOIN_LEITURA} WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = 'GB' ORDER BY l.dt_hr_leitura DESC LIMIT 1), 16) AS ramTotalGb,
            COALESCE((SELECT MAX(l.valor) ${JOIN_LEITURA} WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%' AND l.dt_hr_leitura >= NOW() - INTERVAL 24 HOUR), 0) AS pico24hPct,
            COALESCE((SELECT DATE_FORMAT(l.dt_hr_leitura, '%H:%i') ${JOIN_LEITURA} WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%' AND l.dt_hr_leitura >= NOW() - INTERVAL 24 HOUR ORDER BY l.valor DESC LIMIT 1), '--:--') AS pico24hHorario,
            COALESCE((SELECT ROUND((SUM(l.valor > 60) / COUNT(*)) * 100, 1) ${JOIN_LEITURA} WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%' AND DATE(l.dt_hr_leitura) = CURDATE()), 0) AS tempoForaNormalPct;
    `);
}

function buscarHistoricoRam(idMaquina, periodo) {
    const filtro = periodo === "1h" ? "1 HOUR" : periodo === "7d" ? "7 DAY" : "24 HOUR";
    const formato = periodo === "1h" ? "%H:%i:%s" : periodo === "7d" ? "%d/%m %Hh" : "%H:%i";

    return database.executar(`
        SELECT DATE_FORMAT(l.dt_hr_leitura, '${formato}') AS horario, l.valor AS ramPct
        ${JOIN_LEITURA}
        WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
          AND l.dt_hr_leitura >= NOW() - INTERVAL ${filtro}
        ORDER BY l.dt_hr_leitura ASC;
    `);
}

function buscarSerieVazamento(idMaquina) {
    return database.executar(`
        SELECT DATE_FORMAT(MIN(l.dt_hr_leitura), '%H:%i') AS horario, ROUND(AVG(l.valor), 1) AS ramPct
        ${JOIN_LEITURA}
        WHERE cm.fk_maquina = ${idMaquina} AND cc.tipo = 'RAM' AND cc.unidade_medida = '%'
          AND l.dt_hr_leitura >= NOW() - INTERVAL 6 HOUR
        GROUP BY DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H')
        ORDER BY MIN(l.dt_hr_leitura) ASC;
    `);
}

function buscarDispersaoRede(idMaquina) {
    return database.executar(`
        SELECT
            ROUND(AVG(CASE WHEN cc.tipo = 'Rede' THEN l.valor END), 2) AS trafegoRede,
            ROUND(AVG(CASE WHEN cc.tipo = 'RAM' AND cc.unidade_medida = '%' THEN l.valor END), 1) AS ramPct
        ${JOIN_LEITURA}
        WHERE cm.fk_maquina = ${idMaquina}
          AND l.dt_hr_leitura >= NOW() - INTERVAL 24 HOUR
        GROUP BY DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i')
        HAVING trafegoRede IS NOT NULL AND ramPct IS NOT NULL
        ORDER BY MIN(l.dt_hr_leitura) DESC
        LIMIT 120;
    `);
}

module.exports = {
    listarServidores,
    buscarKPIs,
    buscarHistoricoRam,
    buscarSerieVazamento,
    buscarDispersaoRede
};