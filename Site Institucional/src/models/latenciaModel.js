var database = require("../database/config");

// Latência da rede (componentes tipo 'Rede' em 'ms'), média e pico por hora do dia,
// considerando as últimas 24h a partir da leitura de latência mais recente da empresa.
// (usamos a última leitura como referência, igual ao serieRecente do dashboardModel,
//  assim o gráfico não fica vazio se o relógio do banco estiver em outro fuso)
function latenciaPorHora(idEmpresa, idMaquina) {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql = `
        SELECT HOUR(l.dt_hr_leitura) AS hora,
               ROUND(AVG(l.valor), 1) AS media,
               ROUND(MAX(l.valor), 1) AS pico
        FROM leitura l
        JOIN config_maq cm ON cm.id = l.fk_config_maq
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ${idEmpresa} ${filtroMaquina}
          AND cc.tipo = 'Rede' AND cc.unidade_medida = 'ms'
          AND l.dt_hr_leitura > (
              SELECT MAX(l2.dt_hr_leitura)
              FROM leitura l2
              JOIN config_maq cm2 ON cm2.id = l2.fk_config_maq
              JOIN maquina m2 ON m2.id = cm2.fk_maquina
              JOIN componentes c2 ON c2.id = cm2.fk_componentes
              JOIN configuracao_comp cc2 ON cc2.id = c2.fk_configuracao_comp
              WHERE m2.fk_empresa = ${idEmpresa}
                AND cc2.tipo = 'Rede' AND cc2.unidade_medida = 'ms'
          ) - INTERVAL 24 HOUR
        GROUP BY HOUR(l.dt_hr_leitura)
        ORDER BY hora;
    `;
    return database.executar(instrucaoSql);
}

// Volume de requisições por hora (RPS = requisições por segundo).
// Usa as "novas_conexoes" que a captura de rede (biblioteca 'interno') já grava:
// soma as novas conexões de cada minuto (todas as máquinas) e divide por 60.
function requisicoesPorHora(idEmpresa, idMaquina) {
    var filtroMaquina = idMaquina ? `AND m.id = ${idMaquina}` : "";
    var instrucaoSql = `
        SELECT t.hora, ROUND(AVG(t.novas_minuto) / 60, 2) AS rps
        FROM (
            SELECT DATE_FORMAT(l.dt_hr_leitura, '%Y-%m-%d %H:%i') AS chave_min,
                   HOUR(l.dt_hr_leitura) AS hora,
                   SUM(l.valor) AS novas_minuto
            FROM leitura l
            JOIN config_maq cm ON cm.id = l.fk_config_maq
            JOIN maquina m ON m.id = cm.fk_maquina
            JOIN componentes c ON c.id = cm.fk_componentes
            JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
            WHERE m.fk_empresa = ${idEmpresa} ${filtroMaquina}
              AND cc.biblioteca = 'interno' AND cc.codigo = 'novas_conexoes'
              AND l.dt_hr_leitura > (
                  SELECT MAX(l2.dt_hr_leitura)
                  FROM leitura l2
                  JOIN config_maq cm2 ON cm2.id = l2.fk_config_maq
                  JOIN maquina m2 ON m2.id = cm2.fk_maquina
                  JOIN componentes c2 ON c2.id = cm2.fk_componentes
                  JOIN configuracao_comp cc2 ON cc2.id = c2.fk_configuracao_comp
                  WHERE m2.fk_empresa = ${idEmpresa}
                    AND cc2.biblioteca = 'interno' AND cc2.codigo = 'novas_conexoes'
              ) - INTERVAL 24 HOUR
            GROUP BY chave_min, hora
        ) AS t
        GROUP BY t.hora
        ORDER BY t.hora;
    `;
    return database.executar(instrucaoSql);
}

// Limite de ALERTA (nível 2) da latência cadastrado para a empresa na tabela limites.
// É o mesmo valor que o Captura_PeakStack.py usa para classificar a leitura como Alerta.
function limiteAlertaLatencia(idEmpresa) {
    var instrucaoSql = `
        SELECT MIN(li.valor_min) AS limite
        FROM limites li
        JOIN componentes c ON c.id = li.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE li.fk_empresa = ${idEmpresa}
          AND li.nivel = 2
          AND cc.tipo = 'Rede' AND cc.unidade_medida = 'ms';
    `;
    return database.executar(instrucaoSql);
}

module.exports = { latenciaPorHora, requisicoesPorHora, limiteAlertaLatencia };