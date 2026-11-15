const { EC2Client } = require('@aws-sdk/client-ec2');
const { PricingClient } = require('@aws-sdk/client-pricing');

// As variáveis devem ser carregadas pelo app.js ou injetadas pelo Docker.
function variavelObrigatoria(nome) {
    const valor = process.env[nome];
    if (!valor || !valor.trim()) {
        throw new Error(`Variável de ambiente não definida: ${nome}`);
    }
    return valor;
}

// Os nomes em minúsculo precisam ser mapeados explicitamente para o SDK.
const credentials = {
    accessKeyId: variavelObrigatoria('aws_access_key_id'),
    secretAccessKey: variavelObrigatoria('aws_secret_access_key'),
    ...(process.env.aws_session_token
        ? { sessionToken: process.env.aws_session_token }
        : {})
};

const regiao = variavelObrigatoria('AWS_REGION');

const ec2 = new EC2Client({ region: regiao, credentials });

// Região do catálogo de preços; a região do recurso será filtro da consulta.
const pricing = new PricingClient({ region: 'us-east-1', credentials });

module.exports = { ec2, pricing, regiao };
