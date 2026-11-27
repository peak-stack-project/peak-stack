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

// Última leitura de cada métrica de rede (biblioteca = 'interno') por máquina da empresa.
function ultimasLeiturasRede(idEmpresa) {
    var instrucaoSql = `
        SELECT m.id AS idMaquina, m.nome AS servidor, e.nome_fantasia AS empresa,
               cc.codigo, l.valor, l.dt_hr_leitura, d.situacao,
               TIMESTAMPDIFF(SECOND, l.dt_hr_leitura, NOW()) AS segundos
        FROM maquina m
        JOIN empresa e ON e.id = m.fk_empresa
        JOIN config_maq cm ON cm.fk_maquina = m.id AND cm.status_config = 'Ativo'
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp AND cc.biblioteca = 'interno'
        JOIN leitura l ON l.fk_config_maq = cm.id
        LEFT JOIN discretizada d ON d.fk_leitura = l.id
        WHERE m.fk_empresa = ${idEmpresa}
          AND l.id = (SELECT MAX(l2.id) FROM leitura l2 WHERE l2.fk_config_maq = cm.id);
    `;
    return database.executar(instrucaoSql);
}

// Série dos últimos 60 minutos de conexões ativas (total) e novas conexões por minuto.
function serieRedeRecente(idEmpresa) {
    var instrucaoSql = `
        SELECT t.minuto,
               t.hora,
               t.codigo,
               ROUND(SUM(t.valor_minuto), 0) AS valor,
               MIN(t.inicio) AS inicio
        FROM (
            SELECT DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i') AS chave_min,
                   DATE_FORMAT(l.dt_hr_leitura, '%H:%i') AS minuto,
                   HOUR(l.dt_hr_leitura) AS hora,
                   m.id AS fk_maquina,
                   cc.codigo,
                   CASE
                       WHEN cc.codigo = 'novas_conexoes' THEN SUM(l.valor)
                       ELSE AVG(l.valor)
                   END AS valor_minuto,
                   MIN(l.dt_hr_leitura) AS inicio
            FROM leitura l
            JOIN config_maq cm ON cm.id = l.fk_config_maq
            JOIN maquina m ON m.id = cm.fk_maquina
            JOIN componentes c ON c.id = cm.fk_componentes
            JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
            WHERE m.fk_empresa = ${idEmpresa}
              AND cc.biblioteca = 'interno'
              AND cc.codigo IN ('total', 'novas_conexoes')
              AND l.dt_hr_leitura >= (
                  SELECT MAX(l2.dt_hr_leitura)
                  FROM leitura l2
                  JOIN config_maq cm2 ON cm2.id = l2.fk_config_maq
                  JOIN maquina m2 ON m2.id = cm2.fk_maquina
                  JOIN componentes c2 ON c2.id = cm2.fk_componentes
                  JOIN configuracao_comp cc2 ON cc2.id = c2.fk_configuracao_comp
                  WHERE m2.fk_empresa = ${idEmpresa} AND cc2.biblioteca = 'interno'
              ) - INTERVAL 60 MINUTE
            GROUP BY chave_min, minuto, hora, m.id, cc.codigo
        ) AS t
        GROUP BY t.chave_min, t.minuto, t.hora, t.codigo
        ORDER BY inicio;
    `;
    return database.executar(instrucaoSql);
}

// Baseline histórico (média e desvio padrão por hora do dia nos últimos 7 dias).
function baselineRedePorHora(idEmpresa) {
    var instrucaoSql = `
        SELECT s.hora,
               s.codigo,
               ROUND(AVG(s.valor_minuto), 1) AS media,
               ROUND(STDDEV_POP(s.valor_minuto), 1) AS desvio
        FROM (
            SELECT t.chave_min,
                   t.hora,
                   t.codigo,
                   SUM(t.valor_maq) AS valor_minuto
            FROM (
                SELECT DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i') AS chave_min,
                       HOUR(l.dt_hr_leitura) AS hora,
                       m.id AS fk_maquina,
                       cc.codigo,
                       CASE
                           WHEN cc.codigo = 'novas_conexoes' THEN SUM(l.valor)
                           ELSE AVG(l.valor)
                       END AS valor_maq
                FROM leitura l
                JOIN config_maq cm ON cm.id = l.fk_config_maq
                JOIN maquina m ON m.id = cm.fk_maquina
                JOIN componentes c ON c.id = cm.fk_componentes
                JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
                WHERE m.fk_empresa = ${idEmpresa}
                  AND cc.biblioteca = 'interno'
                  AND cc.codigo IN ('total', 'novas_conexoes')
                  AND l.dt_hr_leitura >= NOW() - INTERVAL 7 DAY
                GROUP BY chave_min, hora, m.id, cc.codigo
            ) AS t
            GROUP BY t.chave_min, t.hora, t.codigo
        ) AS s
        GROUP BY s.hora, s.codigo;
    `;
    return database.executar(instrucaoSql);
}

// Total de portas novas abertas nos últimos 60 minutos de leitura.
function portasNovasUltimaHora(idEmpresa) {
    var instrucaoSql = `
        SELECT COALESCE(SUM(l.valor), 0) AS portasNovas
        FROM leitura l
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ${idEmpresa}
          AND cc.biblioteca = 'interno'
          AND cc.codigo = 'portas_novas'
          AND l.dt_hr_leitura >= (
              SELECT MAX(l2.dt_hr_leitura)
              FROM leitura l2
              JOIN config_maq cm2 ON cm2.id = l2.fk_config_maq
              JOIN maquina m2 ON m2.id = cm2.fk_maquina
              JOIN componentes c2 ON c2.id = cm2.fk_componentes
              JOIN configuracao_comp cc2 ON cc2.id = c2.fk_configuracao_comp
              WHERE m2.fk_empresa = ${idEmpresa} AND cc2.biblioteca = 'interno'
          ) - INTERVAL 60 MINUTE;
    `;
    return database.executar(instrucaoSql);
}

// Log de eventos de segurança das últimas 24h (Alerta/Crítico nas métricas de rede).
function eventosRedeRecentes(idEmpresa) {
    var instrucaoSql = `
        SELECT DATE_FORMAT(l.dt_hr_leitura, '%H:%i') AS hora,
               m.nome AS servidor,
               c.nome AS componente,
               cc.codigo,
               d.situacao,
               MAX(l.valor) AS pico,
               MAX(l.dt_hr_leitura) AS ultima
        FROM discretizada d
        JOIN leitura l ON l.id = d.fk_leitura
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ${idEmpresa}
          AND cc.biblioteca = 'interno'
          AND d.situacao IN ('Alerta', 'Crítico')
          AND l.dt_hr_leitura >= NOW() - INTERVAL 24 HOUR
        GROUP BY DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i'), hora, m.nome, c.nome, cc.codigo, d.situacao
        ORDER BY ultima DESC
        LIMIT 10;
    `;
    return database.executar(instrucaoSql);
}

module.exports = {
    ultimasLeituras,
    serieHoraria,
    serieRecente,
    historicoTempoReal,
    eventosRecentes,
    ultimasLeiturasRede,
    serieRedeRecente,
    baselineRedePorHora,
    portasNovasUltimaHora,
    eventosRedeRecentes
};