// Consulta o catálogo público JSON da AWS, sem credenciais.
const Decimal = require("decimal.js");
const { Readable, Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const ORIGEM = "https://pricing.us-east-1.amazonaws.com";
const FONTE = "AWS Price List / catálogo público JSON";
const TEMPO_LIMITE = 10 * 60 * 1000;

async function baixarCatalogo(resposta, consultas, signal) {
    const [{ parser }, { pick }, { streamValues }] = await Promise.all([
        import("stream-json"),
        import("stream-json/filters/pick.js"),
        import("stream-json/streamers/stream-values.js")
    ]);
    const produtos = {};
    const precosPorSku = {};
    const filtros = Object.values(consultas);
    const encerrar = new AbortController();
    let completo = false;

    const destino = new Writable({
        objectMode: true,
        write({ value }, encoding, concluir) {
            try {
                if (value.sku && value.productFamily) {
                    if (filtros.some(filtro => corresponde(value, filtro))) {
                        produtos[value.sku] = value;
                    }
                } else {
                    const sku = Object.values(value)[0]?.sku;
                    if (sku && produtos[sku]) {
                        precosPorSku[sku] = value;
                        if (Object.keys(produtos).every(skuProduto => precosPorSku[skuProduto])) {
                            completo = true;
                            // Todos os produtos já foram lidos antes da seção de tarifas.
                            // Não precisamos baixar o restante dos preços ou as reservas.
                            encerrar.abort();
                        }
                    }
                }
                concluir();
            } catch (erro) {
                concluir(erro);
            }
        }
    });
    try {
        await pipeline(
            Readable.from(resposta.body),
            parser.asStream({ streamValues: false, streamKeys: false }),
            pick.asStream({ filter: /^(products\.[^.]+|terms\.OnDemand\.[^.]+)$/ }),
            streamValues.asStream(),
            destino,
            { signal: AbortSignal.any([signal, encerrar.signal]) }
        );
    } catch (erro) {
        if (!completo || signal.aborted || erro.name !== "AbortError") throw erro;
    }
    return { produtos, precosPorSku };
}

function corresponde(produto, filtros) {
    const atributos = { ...produto.attributes, productFamily: produto.productFamily };
    for (const campo in filtros) {
        const esperado = filtros[campo];
        if (Array.isArray(esperado)) {
            if (!esperado.includes(atributos[campo])) return false;
        } else if (atributos[campo] !== esperado) {
            return false;
        }
    }
    return true;
}

function criarTarifa(produto, termo, dimensao, categoria, moeda, preco, url, servico = "AmazonEC2") {
    if (typeof preco !== "string" || !/^\d+(?:\.\d+)?$/.test(preco)) {
        throw new Error("Tarifa inválida no catálogo AWS.");
    }
    if (!produto.sku || !dimensao.rateCode || !dimensao.unit || !moeda) {
        throw new Error("Dimensão de preço incompleta no catálogo AWS.");
    }
    return {
        categoria,
        servico,
        sku: produto.sku,
        atributos: produto.attributes || {},
        modalidade: "OnDemand",
        vigencia: termo.effectiveDate || null,
        codigo_tarifa: dimensao.rateCode,
        descricao: dimensao.description || null,
        unidade: dimensao.unit,
        inicio_faixa: dimensao.beginRange || null,
        fim_faixa: dimensao.endRange || null,
        aplica_se_a: dimensao.appliesTo || [],
        moeda,
        preco_unitario: preco,
        fonte: FONTE,
        url_fonte: url
    };
}

function montarTarifas({ produtos, precosPorSku }, consultas, url) {
    const tarifas = [];
    for (const produto of Object.values(produtos)) {
        for (const [categoria, filtros] of Object.entries(consultas)) {
            if (!corresponde(produto, filtros)) continue;

            // Produtos e preços ficam separados no JSON, relacionados pelo SKU.
            const termos = precosPorSku[produto.sku] || {};
            for (const termo of Object.values(termos)) {
                for (const dimensao of Object.values(termo.priceDimensions || {})) {
                    for (const [moeda, preco] of Object.entries(dimensao.pricePerUnit || {})) {
                        tarifas.push(criarTarifa(produto, termo, dimensao, categoria, moeda, preco, url));
                    }
                }
            }
        }
    }
    for (const categoria in consultas) {
        if (!tarifas.some(tarifa => tarifa.categoria === categoria)) {
            throw new Error(`Nenhuma tarifa On-Demand encontrada para ${categoria}. Confira região e configuração.`);
        }
    }
    return tarifas;
}

async function coletarPrecos(configuracao) {
    const { regiao, tipoInstancia, sistemaOperacional, tiposVolume = [] } = configuracao;
    const signal = AbortSignal.timeout(TEMPO_LIMITE);

    for (const campo of ["regiao", "tipoInstancia", "sistemaOperacional"]) {
        if (typeof configuracao[campo] !== "string" || !configuracao[campo].trim()) {
            throw new Error(`Informe ${campo} para consultar as tarifas.`);
        }
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)+-\d+$/.test(regiao)) {
        throw new Error("Região inválida para a consulta de preços da AWS.");
    }

    const consultas = {
        EC2: {
            regionCode: regiao,
            productFamily: "Compute Instance",
            instanceType: tipoInstancia,
            operatingSystem: sistemaOperacional,
            tenancy: "Shared",
            preInstalledSw: "NA",
            capacitystatus: "Used"
        }
    };
    if (tiposVolume.length) {
        consultas.EBS = { regionCode: regiao, productFamily: "Storage", volumeApiName: tiposVolume };
    }

    const url = `${ORIGEM}/offers/v1.0/aws/AmazonEC2/current/${regiao}/index.json`;
    const resposta = await fetch(url, { signal, redirect: "error" });
    if (!resposta.ok) {
        throw new Error(`Catálogo AWS indisponível (HTTP ${resposta.status}).`);
    }

    const catalogo = await baixarCatalogo(resposta, consultas, signal);
    return {
        consultado_em: new Date().toISOString(),
        tarifas: montarTarifas(catalogo, consultas, url)
    };
}

async function coletarPrecoRede(regiao) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)+-\d+$/.test(regiao)) throw new Error("Região inválida para consultar o preço de Rede.");
    const url = `${ORIGEM}/offers/v1.0/aws/AWSDataTransfer/current/${regiao}/index.json`;
    const resposta = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!resposta.ok) throw new Error(`Catálogo AWS de Rede indisponível (HTTP ${resposta.status}).`);

    const catalogo = await resposta.json();
    const tarifas = Object.values(catalogo.products).filter(produto => corresponde(produto, {
        productFamily: "Data Transfer", transferType: "AWS Outbound", fromRegionCode: regiao, toLocation: "External"
    })).flatMap(produto => Object.values(catalogo.terms.OnDemand[produto.sku] || {}).flatMap(termo =>
        Object.values(termo.priceDimensions || {}).filter(dimensao =>
            dimensao.unit === "GB" && dimensao.beginRange === "0" && !dimensao.appliesTo?.length &&
            Number(dimensao.pricePerUnit?.USD) > 0
        ).map(dimensao => criarTarifa(produto, termo, dimensao, "Rede", "USD", dimensao.pricePerUnit.USD, url, "AWSDataTransfer"))));
    if (tarifas.length !== 1) throw new Error("Primeira faixa paga de saída para a internet sem tarifa USD única.");
    return tarifas[0];
}

function selecionarTarifa(tarifas, categoria, unidade, combina = () => true) {
    const opcoes = tarifas.filter(tarifa =>
        tarifa.categoria === categoria && tarifa.modalidade === "OnDemand" &&
        tarifa.unidade === unidade && tarifa.moeda === "USD" &&
        new Decimal(tarifa.inicio_faixa ?? -1).equals(0) &&
        tarifa.fim_faixa === "Inf" && !tarifa.aplica_se_a?.length && combina(tarifa.atributos)
    );
    if (opcoes.length !== 1) {
        const erro = new Error(`É necessária uma tarifa USD única, sem faixas, para ${categoria} (${unidade}). Encontradas: ${opcoes.length}.`);
        erro.code = "TARIFA_INCOMPATIVEL";
        throw erro;
    }
    return opcoes[0];
}

module.exports = { coletarPrecos, coletarPrecoRede, selecionarTarifa };
