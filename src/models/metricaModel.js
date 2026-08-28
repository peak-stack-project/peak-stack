var database = require("../database/config");

function registrar_checkpoint(etapa_funil, id_usuario) {
    // Se o id_usuario for undefined (ex: visitante não logado clicou no CTA), 
    // nós inserimos a palavra NULL no banco de dados
    var fk_usuario = id_usuario == undefined ? 'NULL' : id_usuario;

    // Aqui vai o INSERT INTO com as variaveis que passamos pelo front
    var instrucaoSql = `
        INSERT INTO metrica_funil (etapa_funil, fk_usuario) VALUES ('${etapa_funil}', ${fk_usuario});
    `;

    console.log("Executando a instrução SQL: \n" + instrucaoSql);
    return database.executar(instrucaoSql);
}

function calcularPercentual(valor, total) {
    if (total == 0) {
        return 0;
    }

    return Number(((valor / total) * 100).toFixed(1));
}


function buscarIndicadoresDashboard() {
    var instrucaoSql = `
        SELECT
           SUM(CASE WHEN etapa_funil = 'acesso_home' THEN 1 ELSE 0 END) AS acessos,
           SUM(CASE WHEN etapa_funil = 'clique_cta' THEN 1 ELSE 0 END) AS cta,
           SUM(CASE WHEN etapa_funil = 'cadastro_realizado' THEN 1 ELSE 0 END) AS cadastros,
           COUNT(DISTINCT CASE 
       WHEN etapa_funil LIKE 'acessou_vitrine%' 
       THEN fk_usuario 
   END)  AS vitrine,
           COUNT(DISTINCT CASE 
       WHEN etapa_funil LIKE 'avaliacao_realizada_%' 
       THEN fk_usuario 
   END) AS avaliacoes,
           SUM(CASE WHEN etapa_funil LIKE 'avaliou_apos_aviso_%' THEN 1 ELSE 0 END) AS avaliacoesAposAlerta,
           SUM(CASE WHEN etapa_funil = 'finalizou_vitrine' THEN 1 ELSE 0 END) AS finalizouVitrine
        FROM metrica_funil;
    `;

    return database.executar(instrucaoSql).then(function (resultado) {
        var linha = resultado[0];

        return {
            acessos: Number(linha.acessos),
            cta: Number(linha.cta),
            cadastros: Number(linha.cadastros),
            vitrine: Number(linha.vitrine),
            avaliacoes: Number(linha.avaliacoes),
            avaliacoesAposAlerta: Number(linha.avaliacoesAposAlerta),
            finalizouVitrine: Number(linha.finalizouVitrine)
        };
    });
}

function buscarMarcaTop() {
    var instrucaoSql = `
        SELECT
            m.nome AS nome,
            ROUND(AVG(grau_interesse), 1) AS media,
            COUNT(*) AS totalAvaliacoes
        FROM vitrine_marcas
        JOIN marca as m ON m.idmarca =fk_marca
        GROUP BY m.nome
        ORDER BY media DESC, totalAvaliacoes DESC, m.nome ASC
        LIMIT 1;
    `;

    return database.executar(instrucaoSql).then(function (resultado) {
        var linha = resultado[0];

        if (linha == undefined) {
            return null;
        }

        return {
            nome: linha.nome,
            media: Number(linha.media),
            totalAvaliacoes: Number(linha.totalAvaliacoes)
        };
    });
}

function buscarNotasMedias() {
    var instrucaoSql = `
        SELECT
            m.nome AS nome,
            ROUND(AVG(grau_interesse), 1) AS media,
            COUNT(*) AS totalAvaliacoes
        FROM vitrine_marcas
        JOIN marca as m ON m.idmarca =fk_marca
        GROUP BY  m.nome
        ORDER BY media DESC,  m.nome ASC;
    `;

    return database.executar(instrucaoSql).then(function (resultado) {
        return resultado.map(function (linha) {
            return {
                nome: linha.nome,
                media: Number(linha.media),
                totalAvaliacoes: Number(linha.totalAvaliacoes)
            };
        });
    });
}


async function obterDashboard() {
    var indicadores = await buscarIndicadoresDashboard();
    var marcaTop = await buscarMarcaTop();
    var notasMedias = await buscarNotasMedias();

    return {
        acessos: indicadores.acessos,
        cadastros: indicadores.cadastros,
        conversao: calcularPercentual(indicadores.cadastros, indicadores.acessos),
        marcaTop: marcaTop,
        avaliacoesAposAlerta: indicadores.avaliacoesAposAlerta,
        funil: [
            {
                etapa: "Acessos",
                total: indicadores.acessos,
                percentual: calcularPercentual(indicadores.acessos, indicadores.acessos)
            },
            {
                etapa: "CTA",
                total: indicadores.cta,
                percentual: calcularPercentual(indicadores.cta, indicadores.acessos)
            },
            {
                etapa: "Cadastro",
                total: indicadores.cadastros,
                percentual: calcularPercentual(indicadores.cadastros, indicadores.acessos)
            },
            {
                etapa: "Vitrine",
                total: indicadores.vitrine,
                percentual: calcularPercentual(indicadores.vitrine, indicadores.acessos)
            },
            {
                etapa: "Avaliou",
                total: indicadores.avaliacoes,
                percentual: calcularPercentual(indicadores.avaliacoes, indicadores.acessos)
            },
            {
                etapa: "Finalizou",
                total: indicadores.finalizouVitrine,
                percentual: calcularPercentual(indicadores.finalizouVitrine, indicadores.acessos)
            }
        ],
        notasMedias: notasMedias
    };
}

module.exports = {
    registrar_checkpoint,
    obterDashboard
};
