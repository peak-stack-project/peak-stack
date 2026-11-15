// No Docker, as variaveis sao fornecidas pelo env_file do Compose.
async function testarAWS() {
    const { ec2, regiao } = require('./src/config/aws');
    const { DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

    try {
        // Uma pagina basta para testar o acesso, sem listar toda a conta.
        const resposta = await ec2.send(new DescribeInstancesCommand({
            MaxResults: 5
        }));

        const instancias = (resposta.Reservations || [])
            .flatMap(reserva => reserva.Instances || []);

        console.log(`Consulta EC2 realizada com sucesso na regiao ${regiao}.`);
        console.log(`Instancias nesta pagina: ${instancias.length}.`);

        if (instancias.length === 0) {
            console.log('Nenhuma instancia retornada nesta pagina; isso nao indica falha de autenticacao.');
        }

        console.log('Este teste verifica apenas a consulta EC2, sem validar volumes ou precos.');
    } finally {
        ec2.destroy();
    }
}

testarAWS().catch(erro => {
    console.error('Falha no teste AWS:', erro.name, erro.message);
    process.exitCode = 1;
});
