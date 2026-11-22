const model = require("../models/custos/custosModel");

async function consultar(req, res) {
    try {
        const empresas = await model.empresasPeakstack();
        if (empresas.length !== 1) {
            return res.status(409).json({ erro: "O banco precisa ter exatamente uma empresa com nome fantasia PeakStack." });
        }

        const empresa = empresas[0].id;
        const instanciasEc2 = await model.listarInstanciasEc2(empresa);
        if (!instanciasEc2.length) return res.json({ estado: "aguardando", mensagem: "Aguardando registros do Captura_EC2 no banco." });
        if (instanciasEc2.length > 1) return res.status(409).json({ erro: "O painel espera uma única EC2 registrada para a PeakStack." });

        const instanciaEc2 = instanciasEc2[0];

        const [capturas, periodos, leituras] = await Promise.all([
            model.ultimaCaptura(empresa, instanciaEc2),
            model.periodo(empresa, instanciaEc2),
            model.metricas(empresa, instanciaEc2.fk_maquina)
        ]);
        
        if (!capturas.length) return res.json({ estado: "aguardando", mensagem: "Aguardando captura da EC2." });
        
        const linha = capturas[0];
        const dados = typeof linha.dados === "string" ? JSON.parse(linha.dados) : linha.dados;
        
        if (!dados || dados.instancia_id !== instanciaEc2.instancia_id || dados.identidade?.regiao !== instanciaEc2.regiao) {
            throw new Error("Snapshot EC2 inválido.");
        }
        
        const metricas = {};
        for (const leitura of leituras) {
            const tipo = leitura.tipo.toLowerCase();
            const valor = leitura.valor === null ? NaN : Number(leitura.valor);
            const idadeLeitura = Number(leitura.idade_segundos);
            if (!metricas[tipo] && Number.isFinite(valor)) metricas[tipo] = {
                valor, capturado_em_local: leitura.capturado_em_local,
                desatualizada: leitura.idade_segundos === null || !Number.isFinite(idadeLeitura) || idadeLeitura > 60 || idadeLeitura < -5
            };
        }
        const idade = Date.now() - Date.parse(linha.capturado_em);
        const idadeInventario = Date.now() - Date.parse(linha.inventario_consultado_em);
        const custos = await model.obterPainel(empresa, instanciaEc2);
        return res.json({
            estado: "disponivel", atualizado_em: new Date().toISOString(),
            maquina: { id: instanciaEc2.fk_maquina, nome: linha.maquina },
            identidade: dados.identidade, inventario: dados.inventario ?? null,
            estado_inventario: linha.estado_inventario === "atualizado" && (!Number.isFinite(idadeInventario) || idadeInventario > 360000 || idadeInventario < -5000)
                ? "desatualizado" : linha.estado_inventario,
            erro_inventario: dados.erro_inventario?.mensagem || null,
            capturado_em: linha.capturado_em,
            captura_desatualizada: !Number.isFinite(idade) || idade > 60000 || idade < -5000,
            periodo: periodos[0], metricas, custos
        });
    } catch (erro) {
        console.error("[Custos] Falha na leitura do banco:", erro.code || erro.message);
        return res.status(503).json({ erro: "Não foi possível carregar as capturas. Verifique a conexão e a tabela ec2_captura no banco usado pelo Node." });
    }
}

module.exports = { consultar };
