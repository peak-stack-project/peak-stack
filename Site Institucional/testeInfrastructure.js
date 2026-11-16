async function testar() {
    const mac = process.argv[2];
    if (!mac) {
        throw new Error('Uso: node testeInfrastructure.js MAC_DA_MAQUINA');
    }

    const { buscarMaquina } = require('./src/controllers/awsInfrastructure');
    const { ec2 } = require('./src/config/aws');

    try {
        const maquina = await buscarMaquina(mac);
        console.log(JSON.stringify(maquina, null, 2));
        console.log('Consulta de infraestrutura concluida! Capacidade dos volumes em GiB.');
    } finally {
        ec2.destroy();
    }
}

testar().catch(erro => {
    console.error('Falha na consulta de infraestrutura:', erro.name, erro.message);
    process.exitCode = 1;
});
