const { pricing, regiao: regiaoConfigurada } = require('../config/aws');
const { GetProductsCommand } = require('@aws-sdk/client-pricing');

function textoObrigatorio(valor, nome) {
    if (typeof valor !== 'string' || !valor.trim()) {
        throw new Error(`${nome} deve ser informado.`);
    }
    return valor.trim();
}

// Busca uma tarifa publica em USD, percorrendo todas as paginas do catalogo.
async function consultarPreco(filtros, unidade, sufixoUso = '') {
    const precos = new Set();
    let nextToken;

    do {
        const resposta = await pricing.send(new GetProductsCommand({
            ServiceCode: 'AmazonEC2',
            FormatVersion: 'aws_v1',
            Filters: Object.entries(filtros).map(([campo, valor]) => ({
                Type: 'TERM_MATCH', Field: campo, Value: valor
            })),
            NextToken: nextToken
        }));

        for (const item of resposta.PriceList || []) {
            const produto = JSON.parse(item);
            const uso = produto.product?.attributes?.usagetype || '';
            if (sufixoUso && !uso.endsWith(sufixoUso)) continue;

            // OnDemand e a tarifa publica de referencia, sem comparar modalidades.
            for (const termo of Object.values(produto.terms?.OnDemand || {})) {
                for (const dimensao of Object.values(termo.priceDimensions || {})) {
                    if (dimensao.unit !== unidade) continue;
                    if (dimensao.beginRange !== '0' || dimensao.endRange !== 'Inf') continue;
                    const usd = dimensao.pricePerUnit?.USD;
                    if (typeof usd !== 'string' || !usd.trim()) continue;
                    const preco = Number(usd);
                    if (!Number.isFinite(preco) || preco < 0) {
                        throw new Error('O catalogo retornou uma tarifa USD invalida.');
                    }
                    precos.add(preco);
                }
            }
        }
        nextToken = resposta.NextToken;
    } while (nextToken);

    const contexto = Object.entries(filtros)
        .map(([campo, valor]) => `${campo}=${valor}`).join(', ');
    if (precos.size === 0) {
        throw new Error(`Preco nao encontrado (${unidade}; ${contexto}). Nao assumir custo zero.`);
    }
    if (precos.size !== 1) {
        throw new Error(`Preco ambiguo (${unidade}; ${contexto}).`);
    }
    return [...precos][0];
}

// USD por hora: Linux sem software adicional, com tenancy Shared.
async function buscarPrecoEC2(tipoInstancia, regiao = regiaoConfigurada) {
    return consultarPreco({
        productFamily: 'Compute Instance',
        instanceType: textoObrigatorio(tipoInstancia, 'Tipo da instancia'),
        regionCode: textoObrigatorio(regiao, 'Regiao'),
        operatingSystem: 'Linux',
        tenancy: 'Shared',
        preInstalledSw: 'NA',
        capacitystatus: 'Used',
        operation: 'RunInstances'
    }, 'Hrs');
}

// Tarifa base de capacidade mensal; exclui extras de IOPS e throughput.
async function buscarPrecoEBS(tipoVolume, regiao = regiaoConfigurada) {
    const tipo = textoObrigatorio(tipoVolume, 'Tipo do volume');
    if (!['gp2', 'gp3'].includes(tipo)) {
        throw new Error('Tipo EBS fora do escopo inicial: utilize gp2 ou gp3.');
    }
    return consultarPreco({
        productFamily: 'Storage',
        regionCode: textoObrigatorio(regiao, 'Regiao'),
        volumeApiName: tipo
    }, 'GB-Mo', `EBS:VolumeUsage.${tipo}`);
}

module.exports = { buscarPrecoEC2, buscarPrecoEBS };
