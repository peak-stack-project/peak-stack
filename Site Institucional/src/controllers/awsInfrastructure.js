const { ec2, regiao } = require('../config/aws');
const {
    DescribeInstancesCommand,
    DescribeVolumesCommand
} = require('@aws-sdk/client-ec2');

// rejects que servem para formatar da froma esperada
function normalizarMac(mac) {
    const valor = String(mac || '').trim();
    const formatoValido = /^[0-9a-f]{12}$/i.test(valor)
        || /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(valor)
        || /^([0-9a-f]{2}-){5}[0-9a-f]{2}$/i.test(valor);

    if (!formatoValido) {
        throw new Error('MAC Address invalido: informe 12 digitos hexadecimais, com ou sem separadores.');
    }

    return valor.replace(/[:-]/g, '').toLowerCase().match(/.{2}/g).join(':');
}

// O chamador deve fornecer o MAC de uma maquina autorizada para a empresa.
// Este servico consulta a AWS; nao altera o banco nem os recursos.
async function buscarMaquina(mac) {
    const macFormatado = normalizarMac(mac);
    const instancias = [];
    let nextToken;

    do {
        const resposta = await ec2.send(new DescribeInstancesCommand({
            Filters: [
                { Name: 'network-interface.mac-address', Values: [macFormatado] },
                { Name: 'instance-state-name', Values: ['running', 'stopped'] }
            ],
            NextToken: nextToken
        }));

        for (const reserva of resposta.Reservations || []) {
            instancias.push(...(reserva.Instances || []));
        }
        nextToken = resposta.NextToken;
    } while (nextToken);

    if (instancias.length === 0) {
        throw new Error(`Maquina nao encontrada na regiao ${regiao}. Confira o MAC, a conta e o estado da instancia (running ou stopped).`);
    }
    if (instancias.length !== 1) {
        throw new Error('Mais de uma instancia encontrada para o MAC informado.');
    }

    const maquina = instancias[0];
    const volumes = [];
    nextToken = undefined;

    do {
        const resposta = await ec2.send(new DescribeVolumesCommand({
            Filters: [
                { Name: 'attachment.instance-id', Values: [maquina.InstanceId] }
            ],
            NextToken: nextToken
        }));

        volumes.push(...(resposta.Volumes || []));
        nextToken = resposta.NextToken;
    } while (nextToken);

    return {
        instanceId: maquina.InstanceId,
        tipoInstancia: maquina.InstanceType,
        estado: maquina.State?.Name,
        regiao,
        plataforma: maquina.PlatformDetails,
        volumes: volumes.map(volume => ({
            id: volume.VolumeId,
            tipo: volume.VolumeType,
            // A AWS informa a capacidade provisionada em GiB, nao o uso em disco.
            tamanhoGiB: volume.Size
        }))
    };
}

module.exports = { buscarMaquina };
