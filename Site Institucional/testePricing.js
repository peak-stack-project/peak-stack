async function testar() {
    const { buscarPrecoEC2, buscarPrecoEBS } = require('./src/controllers/awsPricing');
    const { pricing, regiao } = require('./src/config/aws');
    const tipoInstancia = process.argv[2] || 't3.small';
    const tipoVolume = process.argv[3] || 'gp3';

    try {
        const precoHora = await buscarPrecoEC2(tipoInstancia, regiao);
        const precoArmazenamento = await buscarPrecoEBS(tipoVolume, regiao);
        console.log(JSON.stringify({
            regiao,
            moeda: 'USD',
            ec2: { tipo: tipoInstancia, precoHora, unidade: 'Hrs' },
            ebs: { tipo: tipoVolume, precoCapacidadeMes: precoArmazenamento, unidade: 'GB-Mo' }
        }, null, 2));
        console.log('Tarifas publicas consultadas! Estes valores nao representam a fatura real.');
        console.log('EBS: somente capacidade provisionada; extras de IOPS/throughput nao incluidos.');
    } finally {
        pricing.destroy();
    }
}

testar().catch(erro => {
    console.error('Falha na consulta de precos:', erro.name, erro.message);
    process.exitCode = 1;
});
