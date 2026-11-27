const Decimal = require("decimal.js");
const { format } = require("mysql2");
const database = require("../../database/config");
const precos = require("./precosModel");
const { selecionarTarifa } = precos;
const SEGUNDOS_DIA = 86400;
const DIA = SEGUNDOS_DIA * 1000;

// Consultas do painel
function executarConsulta(sql, parametros) {
    return database.executar(format(sql, parametros));
}

function parametrosInstancia(empresa, instanciaEc2) {
    return [empresa, instanciaEc2.fk_maquina, instanciaEc2.instancia_id, instanciaEc2.regiao];
}

function empresasPeakstack() {
    return executarConsulta("SELECT id FROM empresa WHERE UPPER(TRIM(nome_fantasia)) = 'PEAKSTACK'");
}

function listarInstanciasEc2(empresa) {
    return executarConsulta(`
        SELECT fk_maquina, instancia_id, regiao
        FROM ec2_captura WHERE fk_empresa = ?
        GROUP BY fk_maquina, instancia_id, regiao LIMIT 2`, [empresa]);
}

function ultimaCaptura(empresa, instanciaEc2) {
    return executarConsulta(`
        SELECT ec.dados, ec.estado_inventario, m.nome AS maquina,
               DATE_FORMAT(ec.capturado_em, '%Y-%m-%dT%H:%i:%sZ') AS capturado_em,
               DATE_FORMAT(ec.inventario_consultado_em, '%Y-%m-%dT%H:%i:%sZ') AS inventario_consultado_em
        FROM ec2_captura ec JOIN maquina m ON m.id = ec.fk_maquina AND m.fk_empresa = ec.fk_empresa
        WHERE ec.fk_empresa = ? AND ec.fk_maquina = ? AND ec.instancia_id = ? AND ec.regiao = ?
        ORDER BY ec.capturado_em DESC LIMIT 1`, parametrosInstancia(empresa, instanciaEc2));
}

function periodo(empresa, instanciaEc2) {
    return executarConsulta(`
        SELECT DATE_FORMAT(MIN(capturado_em), '%Y-%m-%dT%H:%i:%sZ') AS inicio,
               DATE_FORMAT(MAX(capturado_em), '%Y-%m-%dT%H:%i:%sZ') AS fim
        FROM ec2_captura
        WHERE fk_empresa = ? AND fk_maquina = ? AND instancia_id = ? AND regiao = ?`,
    parametrosInstancia(empresa, instanciaEc2));
}

function metricas(empresa, maquina) {
    return executarConsulta(`
        SELECT cc.tipo, l.valor,
               DATE_FORMAT(l.dt_hr_leitura, '%d/%m/%Y %H:%i:%s') AS capturado_em_local,
               TIMESTAMPDIFF(SECOND, l.dt_hr_leitura, NOW()) AS idade_segundos
        FROM config_maq cm
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        JOIN leitura l ON l.fk_config_maq = cm.id
        WHERE m.fk_empresa = ? AND m.id = ? AND cm.status_config = 'Ativo'
          AND UPPER(cc.tipo) IN ('CPU', 'RAM', 'DISCO') AND cc.unidade_medida = '%'
          AND l.id = (SELECT MAX(l2.id) FROM leitura l2 WHERE l2.fk_config_maq = cm.id)
        ORDER BY l.dt_hr_leitura DESC, l.id DESC`, [empresa, maquina]);
}

// Histórico de custos
const filtro = "fk_empresa = ? AND fk_maquina = ? AND instancia_id = ? AND regiao = ?";

async function capturasPendentes(empresa, instanciaEc2) {
    const params = parametrosInstancia(empresa, instanciaEc2);
    const [cursor] = await executarConsulta(`SELECT fk_captura_fim AS ultimo,
        DATE_FORMAT(fim, '%Y-%m-%d %H:%i:%s.%f') AS fim
        FROM ec2_custo_intervalo WHERE ${filtro}
        ORDER BY fim DESC, id DESC LIMIT 1`, params);
    // Reusa a captura final do último intervalo e ignora horários já processados.
    const retomar = cursor ? "AND (id = ? OR capturado_em >= DATE_ADD(?, INTERVAL 1000 MICROSECOND))" : "";
    // Dá ao capturador de componentes tempo para gravar a leitura do mesmo período.
    return executarConsulta(`SELECT id, dados, estado_inventario,
        CONCAT(DATE_FORMAT(capturado_em, '%Y-%m-%dT%H:%i:%s.'), LEFT(DATE_FORMAT(capturado_em, '%f'), 3), 'Z') AS capturado_em
        FROM ec2_captura WHERE ${filtro} ${retomar}
          AND capturado_em <= UTC_TIMESTAMP(6) - INTERVAL 20 SECOND
        ORDER BY capturado_em, id LIMIT 501`,
    cursor ? [...params, cursor.ultimo, cursor.fim] : params);
}

async function leiturasDeEnvio(empresa, instanciaEc2, capturas) {
    const configuracoes = await executarConsulta(`SELECT cm.id FROM config_maq cm
        JOIN maquina m ON m.id = cm.fk_maquina
        JOIN componentes c ON c.id = cm.fk_componentes
        JOIN configuracao_comp cc ON cc.id = c.fk_configuracao_comp
        WHERE m.fk_empresa = ? AND m.id = ? AND cm.status_config = 'Ativo'
          AND cc.tipo = 'Rede' AND cc.unidade_medida = 'MB'
          AND cc.codigo = 'net_io_counters().bytes_sent' LIMIT 2`, [empresa, instanciaEc2.fk_maquina]);
    if (configuracoes.length !== 1) return [];

    const primeiraCaptura = Date.parse(capturas[0].capturado_em);
    return executarConsulta(`SELECT valor, TIMESTAMPDIFF(SECOND, '1970-01-01 00:00:00', dt_hr_leitura) * 1000 AS instante
        FROM leitura WHERE fk_config_maq = ? AND dt_hr_leitura BETWEEN ? AND ?
        ORDER BY dt_hr_leitura, id`, [configuracoes[0].id, dataSql(primeiraCaptura - 30000), dataSql(capturas.at(-1).capturado_em)]);
}

function calcularEnvio(anterior, atual, inicio, fim) {
    if (!anterior || !atual || anterior === atual || inicio - anterior.instante > 30000 ||
        fim - atual.instante > 30000 || atual.instante - anterior.instante > 60000) return null;
    // O coletor grava MiB na coluna identificada como MB.
    const diferenca = new Decimal(atual.valor).minus(anterior.valor);
    return diferenca.isNegative() ? null : diferenca.div(1024);
}

async function buscarTarifas(chave) {
    const [linha] = await executarConsulta(
        "SELECT id, dados FROM ec2_custo_tarifa WHERE chave = ?", [chave]);
    if (!linha) return null;
    const pacote = typeof linha.dados === "string" ? JSON.parse(linha.dados) : linha.dados;
    return { pacote, tarifaId: linha.id };
}

async function salvarTarifas(chave, pacote) {
    await executarConsulta(`INSERT INTO ec2_custo_tarifa (chave, consultado_em, dados)
        VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [chave, dataSql(pacote.consultado_em), JSON.stringify(pacote)]);
    return buscarTarifas(chave);
}

function dataSql(data) {
    return new Date(data).toISOString().replace("T", " ").replace("Z", "");
}

async function salvarIntervalo(empresa, instanciaEc2, anterior, atual, partes, tarifaId) {
    const valores = partes.map(parte => [
        instanciaEc2.fk_maquina, empresa, instanciaEc2.instancia_id, instanciaEc2.regiao,
        anterior.id, atual.id, tarifaId || null, parte.dia,
        dataSql(parte.inicio), dataSql(parte.fim), parte.segundos_cobertos,
        parte.segundos_ec2, parte.segundos_nao_cobertos, parte.custo_ec2,
        parte.custo_ebs, parte.custo_rede, parte.situacao, parte.detalhe, dataSql(new Date())
    ]);
    // Um INSERT para todas as partes: divisão à meia-noite é atômica e idempotente.
    await executarConsulta(`INSERT INTO ec2_custo_intervalo
        (fk_maquina, fk_empresa, instancia_id, regiao, fk_captura_inicio, fk_captura_fim,
         fk_tarifa, dia, inicio, fim, segundos_cobertos, segundos_ec2, segundos_nao_cobertos,
         custo_ec2, custo_ebs, custo_rede, situacao, detalhe, processado_em)
        VALUES ? ON DUPLICATE KEY UPDATE id = id`, [valores]);
}

async function painel(empresa, instanciaEc2) {
    const params = parametrosInstancia(empresa, instanciaEc2);
    const [diarios, ultimo, tarifas] = await Promise.all([
        executarConsulta(`SELECT DATE_FORMAT(dia, '%Y-%m-%d') AS dia,
            SUM(custo_ec2) AS custo_ec2, SUM(custo_ebs) AS custo_ebs,
            SUM(custo_rede) AS custo_rede, SUM(custo_ec2 + custo_ebs) AS total_base,
            SUM(custo_ec2 + custo_ebs + COALESCE(custo_rede, 0)) AS total,
            SUM(CASE WHEN custo_rede IS NULL THEN segundos_ec2 ELSE 0 END) AS segundos_ec2_sem_rede,
            SUM(segundos_cobertos) AS segundos_cobertos,
            SUM(segundos_ec2) AS segundos_ec2,
            SUM(segundos_nao_cobertos) AS segundos_nao_cobertos,
            SUM(CASE WHEN situacao <> 'calculado' THEN 1 ELSE 0 END) AS trechos_sem_estimativa
            FROM ec2_custo_intervalo WHERE ${filtro}
            AND dia >= UTC_DATE() - INTERVAL 120 DAY
            GROUP BY dia ORDER BY dia`, params),
        executarConsulta(`SELECT DATE_FORMAT(processado_em, '%Y-%m-%dT%H:%i:%sZ') AS processado_em,
            DATE_FORMAT(fim, '%Y-%m-%dT%H:%i:%sZ') AS fim, situacao, detalhe
            FROM ec2_custo_intervalo WHERE ${filtro} ORDER BY fk_captura_fim DESC, dia DESC LIMIT 1`, params),
        executarConsulta(`SELECT t.dados FROM ec2_custo_intervalo i JOIN ec2_custo_tarifa t ON t.id = i.fk_tarifa
            WHERE i.fk_empresa = ? AND i.fk_maquina = ? AND i.instancia_id = ? AND i.regiao = ?
            ORDER BY i.fk_captura_fim DESC LIMIT 1`, params)
    ]);
    const tarifa = tarifas[0]?.dados;
    return { diarios, ultimo: ultimo[0] || {}, tarifa: typeof tarifa === "string" ? JSON.parse(tarifa) : tarifa || null };
}

// Previsao do proximo mes
function custoEm24Horas(dia) {
    return new Decimal(dia.total).times(SEGUNDOS_DIA).div(dia.segundos_cobertos);
}

function prever(diarios, incluirRede, agora = new Date()) {
    const hoje = agora.toISOString().slice(0, 10);
    const completos = diarios.filter(diaRegistrado => diaRegistrado.dia < hoje && Number(diaRegistrado.segundos_cobertos) >= SEGUNDOS_DIA * .99
        && Number(diaRegistrado.trechos_sem_estimativa) === 0 && diaRegistrado.total !== null
        && (!incluirRede || Number(diaRegistrado.segundos_cobertos) - Number(diaRegistrado.segundos_ec2_sem_rede) >= SEGUNDOS_DIA * .99));
    if (completos.length < 7) return {
        estado: "historico_insuficiente", dias_validos: completos.length,
        mensagem: incluirRede ? "Aguardando 7 dias encerrados com cobertura suficiente de EC2, EBS e Rede." :
            "São necessários pelo menos 7 dias encerrados com 99% de cobertura e sem trechos inválidos. Dias incompletos não entram na regressão."
    };
    const origem = Date.parse(`${completos[0].dia}T00:00:00Z`);
    const pontos = completos.map(diaRegistrado => ({
        diasDesdeInicio: (Date.parse(`${diaRegistrado.dia}T00:00:00Z`) - origem) / DIA,
        // Normaliza no máximo 1% de amostragem ausente; não usa o acumulado mensal.
        custoDiario: custoEm24Horas(diaRegistrado).toNumber()
    }));
    const mediaDias = pontos.reduce((soma, ponto) => soma + ponto.diasDesdeInicio, 0) / pontos.length;
    const mediaCustos = pontos.reduce((soma, ponto) => soma + ponto.custoDiario, 0) / pontos.length;
    const variancia = pontos.reduce((soma, ponto) => soma + (ponto.diasDesdeInicio - mediaDias) ** 2, 0);
    const covariancia = pontos.reduce((soma, ponto) => soma + (ponto.diasDesdeInicio - mediaDias) * (ponto.custoDiario - mediaCustos), 0);
    const inclinacao = covariancia / variancia;
    const intercepto = mediaCustos - inclinacao * mediaDias;
    const estimar = data => Math.max(0, intercepto + inclinacao * ((data - origem) / DIA));
    const somaTotal = pontos.reduce((soma, ponto) => soma + (ponto.custoDiario - mediaCustos) ** 2, 0);
    const somaErro = pontos.reduce((soma, ponto) => soma + (ponto.custoDiario - (intercepto + inclinacao * ponto.diasDesdeInicio)) ** 2, 0);
    const inicio = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1);
    const fim = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 2, 1);
    const serie = [];
    let total = new Decimal(0);
    for (let instante = inicio; instante < fim; instante += DIA) {
        const valor = new Decimal(estimar(instante));
        total = total.plus(valor);
        serie.push({ dia: new Date(instante).toISOString().slice(0, 10), valor: valor.toFixed(12) });
    }
    const inicioRef = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
    const fimRef = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const referencia = completos.filter(diaRegistrado => diaRegistrado.dia >= inicioRef && diaRegistrado.dia < fimRef);
    const diasRef = (Date.parse(fimRef) - Date.parse(inicioRef)) / DIA;
    const base = referencia.length === diasRef
        ? referencia.reduce((soma, dia) => soma.plus(custoEm24Horas(dia)), new Decimal(0)) : null;
    const variacao = base?.greaterThan(0) ? total.minus(base).div(base).times(100).toNumber() : null;
    const variacaoDiaria = mediaCustos > 0 ? inclinacao * 30 / mediaCustos * 100 : 0;
    const direcao = valor => Math.abs(valor) < 1 ? "Estável" : valor > 0 ? "Aumento" : "Queda";
    return {
        estado: "disponivel", mes: new Date(inicio).toISOString().slice(0, 7),
        total: total.toFixed(12), serie, dias_validos: completos.length,
        inclinacao_diaria: inclinacao, r2: somaTotal < 1e-20 ? 1 : Math.max(0, 1 - somaErro / somaTotal),
        tendencia: direcao(variacao ?? variacaoDiaria),
        comparacao: variacao === null
            ? "Tendência diária da regressão; ainda não há mês encerrado completo para comparar totais."
            : `${variacao.toFixed(2)}% em relação a ${inicioRef.slice(0, 7)} (mês encerrado de referência).`,
        mensagem: `Regressão sobre ${completos.length} dias com pelo menos 99% de cobertura, normalizados para 24h. Datas UTC. Previsões negativas são limitadas a zero; variações abaixo de 1% são consideradas estáveis.`
    };
}

// Processamento dos intervalos de captura
const estados = new Map();
let iniciado = false;

const chaveInstancia = (empresa, instanciaEc2) => `${empresa}:${instanciaEc2.fk_maquina}:${instanciaEc2.instancia_id}:${instanciaEc2.regiao}`;

function configurar(linha) {
    const dados = typeof linha.dados === "string" ? JSON.parse(linha.dados) : linha.dados;
    const inventario = dados?.inventario;
    const idade = Date.parse(linha.capturado_em) - Date.parse(inventario?.consultado_em);
    if (linha.estado_inventario !== "atualizado" || !Number.isFinite(idade) || idade < -5000 || idade > 360000) {
        throw new Error("Inventário ausente ou desatualizado na data da captura.");
    }
    const instancia = inventario.instancia;
    if (!instancia || instancia.id !== dados.instancia_id || !instancia.regiao || !instancia.tipo || !instancia.operacao_uso) throw new Error("Identificação incompleta da instância.");
    if (instancia.tenancy !== "default" || instancia.ciclo_vida !== "on-demand" || !Array.isArray(instancia.codigos_produto) || instancia.codigos_produto.length) {
        throw new Error("Estimativa disponível somente para EC2 On-Demand Shared sem produtos Marketplace.");
    }
    const sistemas = { "Linux/UNIX": "Linux", "Windows": "Windows" };
    if (!sistemas[instancia.plataforma]) throw new Error("Plataforma sem suporte à seleção de tarifa nesta estimativa.");
    if (!["running", "stopped"].includes(instancia.estado)) throw new Error("Estado transitório da instância; intervalo sem estimativa.");
    if (!Array.isArray(inventario.volumes_ebs)) throw new Error("Inventário de volumes incompleto.");
    const volumes = inventario.volumes_ebs.map(volume => {
        if (!volume.id || !["gp2", "gp3"].includes(volume.tipo) || !Number.isFinite(Number(volume.capacidade_gib)) || Number(volume.capacidade_gib) <= 0 || volume.multi_attach || volume.estado !== "in-use") {
            throw new Error("Volume sem suporte: são aceitos gp2/gp3 anexados, sem Multi-Attach.");
        }
        return { id: volume.id, tipo: volume.tipo, capacidade_gib: Number(volume.capacidade_gib) };
    }).sort((primeiroVolume, segundoVolume) => primeiroVolume.id.localeCompare(segundoVolume.id));
    return { id: instancia.id, regiao: instancia.regiao, tipo: instancia.tipo, sistema: sistemas[instancia.plataforma],
        operacao: instancia.operacao_uso, estado: instancia.estado, volumes };
}

async function obterTarifas(config) {
    // A referência diária usada no cálculo fica no histórico do MySQL.
    const dia = new Date().toISOString().slice(0, 10);
    const tiposVolume = [...new Set(config.volumes.map(volume => volume.tipo))].sort();
    const chave = [dia, config.regiao, config.tipo, config.sistema, config.operacao, tiposVolume.join(",")].join("|");
    const referencia = await buscarTarifas(chave);
    if (referencia) return referencia;
    const { tarifas, consultado_em } = await precos.coletarPrecos({
        regiao: config.regiao, tipoInstancia: config.tipo, sistemaOperacional: config.sistema, tiposVolume
    });
    const ec2 = selecionarTarifa(tarifas, "EC2", "Hrs", atributos =>
        atributos.operation === config.operacao && atributos.instanceType === config.tipo
        && atributos.operatingSystem === config.sistema && atributos.tenancy === "Shared" && atributos.preInstalledSw === "NA");
    const ebs = tiposVolume.map(tipo => ({ tipo, tarifa: selecionarTarifa(
        tarifas, "EBS", "GB-Mo", atributos => atributos.volumeApiName === tipo
            && (!atributos.ebsAzConfiguration || atributos.ebsAzConfiguration === "single-az")
    ) }));
    const pacote = { consultado_em, ec2, ebs,
        criterio: "Tempo observado; EBS proporcional a um mês de 30 dias; somente armazenamento base e computação." };
    return salvarTarifas(chave, pacote);
}

async function obterTarifaRede(regiao) {
    const dia = new Date().toISOString().slice(0, 10);
    const chave = [dia, "Rede", regiao].join("|");
    const referencia = await buscarTarifas(chave);
    if (referencia) return referencia.pacote.rede;
    try {
        const rede = await precos.coletarPrecoRede(regiao);
        const salva = await salvarTarifas(chave, { consultado_em: new Date().toISOString(), rede });
        return salva.pacote.rede;
    } catch (erro) {
        console.warn("[Custos] Tarifa de Rede indisponível:", erro.message);
        return null;
    }
}

function partesDoIntervalo(inicio, fim, situacao, detalhe, config, pacote, custoRede) {
    const partes = [];
    const calculado = situacao === "calculado";
    const ec2Ligada = calculado && config.estado === "running";
    for (let instante = inicio; instante < fim;) {
        const proximoDia = Math.floor(instante / DIA) * DIA + DIA;
        const ate = Math.min(fim, proximoDia);
        const segundos = new Decimal(ate - instante).div(1000);
        let custoEc2 = null;
        let custoEbs = null;
        if (calculado) {
            custoEc2 = ec2Ligada ? segundos.div(3600).times(pacote.ec2.preco_unitario) : new Decimal(0);
            custoEbs = new Decimal(0);
            for (const volume of config.volumes) {
                const { tarifa } = pacote.ebs.find(preco => preco.tipo === volume.tipo);
                const custoVolume = segundos.div(30 * 86400)
                    .times(volume.capacidade_gib).times(tarifa.preco_unitario);
                custoEbs = custoEbs.plus(custoVolume);
            }
        }
        partes.push({ dia: new Date(instante).toISOString().slice(0, 10), inicio: instante, fim: ate,
            segundos_cobertos: calculado ? segundos.toFixed(6) : "0",
            segundos_ec2: ec2Ligada ? segundos.toFixed(6) : "0",
            segundos_nao_cobertos: calculado ? "0" : segundos.toFixed(6),
            custo_ec2: custoEc2?.toFixed(12) ?? null,
            custo_ebs: custoEbs?.toFixed(12) ?? null,
            custo_rede: custoRede?.times(ate - instante).div(fim - inicio).toFixed(12) ?? null, situacao, detalhe });
        instante = ate;
    }
    return partes;
}

async function processar(empresa, instanciaEc2) {
    const chave = chaveInstancia(empresa, instanciaEc2);
    const capturas = await capturasPendentes(empresa, instanciaEc2);
    const leiturasRede = capturas.length > 1 ? await leiturasDeEnvio(empresa, instanciaEc2, capturas) : [];
    let indiceRede = 0, leituraRede, tarifaRede;
    function leituraAte(instante) {
        while (indiceRede < leiturasRede.length && Number(leiturasRede[indiceRede].instante) <= instante) {
            leituraRede = leiturasRede[indiceRede++];
        }
        return leituraRede;
    }
    let mensagem = "Aguardando novos intervalos de captura para atualizar a estimativa.";
    let anterior = capturas[0];
    for (let indice = 1; indice < capturas.length; indice++) {
        const atual = capturas[indice];
        const inicio = Date.parse(anterior.capturado_em), fim = Date.parse(atual.capturado_em);
        if (fim === inicio) continue; // O cálculo trabalha com milissegundos.
        if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio || fim > Date.now() + 5000) {
            throw new Error("Datas de captura inválidas ou fora de ordem; processamento suspenso.");
        }
        let situacao = "calculado", detalhe = null, config, tarifas;
        if (fim - inicio > 60000) {
            situacao = "lacuna";
            detalhe = "Intervalo maior que 60 segundos sem observação contínua. Não representa custo zero.";
        } else {
            try {
                config = configurar(anterior);
                const seguinte = configurar(atual);
                if (config.id !== instanciaEc2.instancia_id || config.regiao !== instanciaEc2.regiao || JSON.stringify(config) !== JSON.stringify(seguinte)) {
                    throw new Error("Configuração mudou entre as capturas; momento da mudança desconhecido.");
                }
            } catch (erro) {
                situacao = "configuracao_invalida";
                detalhe = erro.message.slice(0, 300);
            }
        }
        if (situacao === "calculado") {
            try {
                tarifas = await obterTarifas(config);
            } catch (erro) {
                if (erro.code === "TARIFA_INCOMPATIVEL") {
                    situacao = "tarifa_incompativel";
                    detalhe = erro.message.slice(0, 300);
                } else {
                    // Mantém o cursor durante atualização do catálogo ou falha de transporte.
                    estados.set(chave, { estado: "aguardando_tarifas", mensagem: erro.message });
                    return;
                }
            }
            if (tarifas && [tarifas.pacote.ec2, ...tarifas.pacote.ebs.map(volume => volume.tarifa)]
                .some(tarifa => !Number.isFinite(Date.parse(tarifa.vigencia)) || Date.parse(tarifa.vigencia) > inicio)) {
                situacao = "sem_tarifa_historica";
                detalhe = "As tarifas disponíveis não estavam vigentes neste intervalo histórico.";
            }
        }
        const envio = calcularEnvio(leituraAte(inicio), leituraAte(fim), inicio, fim);
        let custoRede = null;
        if (situacao === "calculado" && config.estado === "running" && envio !== null) {
            if (tarifaRede === undefined) tarifaRede = await obterTarifaRede(config.regiao);
            if (tarifaRede && Date.parse(tarifaRede.vigencia) <= inicio) custoRede = envio.times(tarifaRede.preco_unitario);
        }
        const partes = partesDoIntervalo(inicio, fim, situacao, detalhe, config, tarifas?.pacote, custoRede);
        await salvarIntervalo(empresa, instanciaEc2, anterior, atual, partes, tarifas?.tarifaId);
        anterior = atual;
        mensagem = situacao === "calculado" ? "Custos estimados sobre os intervalos observados." : detalhe;
    }
    estados.set(chave, { estado: capturas.length === 501 ? "processando_historico" : "acompanhando", mensagem });
}

async function ciclo() {
    const inicioCiclo = Date.now();
    try {
        const empresas = await empresasPeakstack();
        for (const empresa of empresas) {
            const instanciasEc2 = await listarInstanciasEc2(empresa.id);
            if (instanciasEc2.length !== 1) continue;
            const instanciaEc2 = instanciasEc2[0];
            try { await processar(empresa.id, instanciaEc2); }
            catch (erro) {
                const chave = chaveInstancia(empresa.id, instanciaEc2);
                const mensagem = erro.code === "ER_NO_SUCH_TABLE" || erro.code === "ER_BAD_FIELD_ERROR"
                    ? "Aplique Banco de Dados/custos_ec2.sql no banco usado pelo Node."
                    : "Não foi possível processar os custos. Verifique banco e registros de captura.";
                if (estados.get(chave)?.mensagem !== mensagem) console.error("[Custos]", mensagem, erro.code || erro.message);
                estados.set(chave, { estado: "indisponivel", mensagem });
            }
        }
    } catch (erro) {
        console.error("[Custos] Não foi possível consultar a empresa interna:", erro.code || erro.message);
    } finally {
        setTimeout(ciclo, Math.max(0, 10000 - (Date.now() - inicioCiclo))).unref();
    }
}

function iniciar() {
    if (iniciado) return;
    iniciado = true;
    ciclo();
}

async function obterPainel(empresa, instanciaEc2) {
    try {
        const { diarios, ultimo, tarifa } = await painel(empresa, instanciaEc2);
        const mes = new Date().toISOString().slice(0, 7);
        const mensais = diarios.filter(diaRegistrado => diaRegistrado.dia.startsWith(mes));
        const temCustos = mensais.some(diaRegistrado => diaRegistrado.total !== null);
        const temRede = mensais.some(diaRegistrado => diaRegistrado.custo_rede !== null);
        const historico = temRede ? diarios : diarios.map(dia => ({ ...dia, total: dia.total_base }));
        const somar = campo => mensais.reduce((soma, diaRegistrado) => soma.plus(diaRegistrado[campo] || 0), new Decimal(0));
        const componentes = temCustos ? [{ servico: "EC2", valor: somar("custo_ec2").toFixed(12) },
            { servico: "EBS", valor: somar("custo_ebs").toFixed(12) }] : [];
        componentes.push({ servico: "Rede", valor: temRede ? somar("custo_rede").toFixed(12) : null });
        const processamento = estados.get(chaveInstancia(empresa, instanciaEc2)) || { estado: "aguardando", mensagem: "Processador de custos iniciando." };
        return {
            ...processamento, mes, moeda: "USD", parcial: true,
            total: temCustos ? somar("total").toFixed(12) : null,
            componentes,
            segundos_ec2: somar("segundos_ec2").toNumber(),
            segundos_cobertos: somar("segundos_cobertos").toNumber(),
            segundos_nao_cobertos: somar("segundos_nao_cobertos").toNumber(),
            trechos_sem_estimativa: somar("trechos_sem_estimativa").toNumber(),
            atualizado_em: ultimo.processado_em, acompanhado_ate: ultimo.fim,
            tarifas_consultadas_em: tarifa?.consultado_em,
            motivo_ultimo_intervalo: ultimo.detalhe,
            diario: historico, previsao: prever(historico, temRede),
            observacoes: "Estimativa parcial dos intervalos observados; lacunas e períodos anteriores à coleta não são custo zero. EBS proporcional a 30 dias. Sem créditos educacionais, mínimos de faturamento ou serviços adicionais."
        };
    } catch (erro) {
        return { estado: "indisponivel", mensagem: "Histórico de custos indisponível. Confira a conexão e se o banco tem a coluna custo_rede em ec2_custo_intervalo." };
    }
}

module.exports = { iniciar, obterPainel, empresasPeakstack, listarInstanciasEc2, ultimaCaptura, periodo, metricas };
