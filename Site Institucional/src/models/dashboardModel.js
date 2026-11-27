var database = require("../database/config");

// Última leitura (em %) de cada componente ATIVO das máquinas da empresa.
function ultimasLeituras(idEmpresa, idMaquina) {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql = `
        SELECT m.id AS idMaquina, m.nome AS servidor, e.nome_fantasia AS empresa,
               cc.tipo, l.valor, l.dt_hr_leitura, d.situacao,
               TIMESTAMPDIFF(SECOND, l.dt_hr_leitura, NOW()) AS segundos
        FROM maquina m
        JOIN empresa e ON e.id = m.fk_empresa
        JOIN config_maq cm ON cm.fk_maquina = m.id AND cm.status_config = 'Ativo'
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp AND cc.unidade_medida = '%'
        JOIN leitura l ON l.fk_config_maq = cm.id
        LEFT JOIN discretizada d ON d.fk_leitura = l.id
        WHERE m.fk_empresa = ${idEmpresa} ${filtroMaquina}
          AND l.id = (SELECT MAX(l2.id) FROM leitura l2 WHERE l2.fk_config_maq = cm.id);
    `;
    return database.executar(instrucaoSql);
}

// CPU e RAM (média por minuto) dos últimos 60 minutos de leitura.
function serieRecente(idEmpresa, idMaquina) {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql = `
        SELECT DATE_FORMAT(l.dt_hr_leitura, '%H:%i') AS minuto, cc.tipo,
               ROUND(AVG(l.valor), 1) AS media, MIN(l.dt_hr_leitura) AS inicio
        FROM leitura l
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ${idEmpresa} ${filtroMaquina}
          AND cc.tipo IN ('CPU', 'RAM') AND cc.unidade_medida = '%'
          AND l.dt_hr_leitura >= (SELECT MAX(l2.dt_hr_leitura) FROM leitura l2) - INTERVAL 60 MINUTE
        GROUP BY DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i'), minuto, cc.tipo
        ORDER BY inicio;
    `;
    return database.executar(instrucaoSql);
}

// Leituras individuais de CPU e RAM de UMA máquina (uma por captura, a cada 5s),
function historicoTempoReal(idEmpresa, idMaquina, minutos) {
    var instrucaoSql = `
        SELECT cc.tipo, l.valor, DATE_FORMAT(l.dt_hr_leitura, '%H:%i:%s') AS hora
        FROM leitura l
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.id = ${idMaquina} AND m.fk_empresa = ${idEmpresa}
          AND cc.tipo IN ('CPU', 'RAM') AND cc.unidade_medida = '%'
          AND l.dt_hr_leitura >= (
              SELECT MAX(l2.dt_hr_leitura)
              FROM leitura l2
              JOIN config_maq cm2 ON cm2.id = l2.fk_config_maq
              WHERE cm2.fk_maquina = ${idMaquina}
          ) - INTERVAL ${minutos} MINUTE
        ORDER BY l.dt_hr_leitura;
    `;
    return database.executar(instrucaoSql);
}

// Média por hora (00..23) de HOJE para um tipo (CPU, RAM...).
function serieHoraria(idEmpresa, tipo, idMaquina) {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql = `
        SELECT HOUR(l.dt_hr_leitura) AS hora, ROUND(AVG(l.valor), 1) AS media
        FROM leitura l
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ${idEmpresa} ${filtroMaquina}
          AND cc.tipo = '${tipo}' AND cc.unidade_medida = '%'
          AND l.dt_hr_leitura >= CURDATE()
        GROUP BY HOUR(l.dt_hr_leitura)
        ORDER BY hora;
    `;
    return database.executar(instrucaoSql);
}

// Log de eventos da máquina: Alerta/Crítico das últimas 24h, agrupados por minuto
function eventosRecentes(idEmpresa, idMaquina) {
    var instrucaoSql = `
        SELECT DATE_FORMAT(l.dt_hr_leitura, '%H:%i') AS hora, cc.tipo, d.situacao,
               MAX(l.valor) AS pico, MAX(l.dt_hr_leitura) AS ultima
        FROM discretizada d
        JOIN leitura l ON l.id = d.fk_leitura
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.id = ${idMaquina} AND m.fk_empresa = ${idEmpresa}
          AND d.situacao IN ('Alerta', 'Crítico')
          AND l.dt_hr_leitura >= NOW() - INTERVAL 24 HOUR
        GROUP BY DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i'), hora, cc.tipo, d.situacao
        ORDER BY ultima DESC
        LIMIT 10;
    `;
    return database.executar(instrucaoSql);
}

// Dados de cadastro de UMA máquina pelo id da MÁQUINA (usado na tela de tempo real).
// Obs.: maquinasModel.buscarMaquinaPorId busca pelo id do config_maq (tela de Máquinas), por isso não serve aqui.
function buscarMaquina(idEmpresa, idMaquina) {
    var instrucaoSql = `
        SELECT m.nome, m.mac_address AS mac, so.nome AS sistema_operacional, e.nome_fantasia
        FROM maquina m
        JOIN so ON so.id = m.fk_so
        JOIN empresa e ON e.id = m.fk_empresa
        WHERE m.id = ${Number(idMaquina)} AND m.fk_empresa = ${Number(idEmpresa)};
    `;
    return database.executar(instrucaoSql);
}

module.exports = { ultimasLeituras, serieHoraria, serieRecente, historicoTempoReal, eventosRecentes, buscarMaquina };