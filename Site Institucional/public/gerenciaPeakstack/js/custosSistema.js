const texto = (id, valor) => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor ?? '—';
};
const camposInstancia = {
    tipoInstancia: 'tipo', regiaoInstancia: 'regiao', zonaInstancia: 'zona_disponibilidade',
    imagemInstancia: 'imagem_id', arquiteturaInstancia: 'arquitetura',
    plataformaInstancia: 'plataforma', estadoInstancia: 'estado', tenancyInstancia: 'tenancy',
    cicloVidaInstancia: 'ciclo_vida', operacaoInstancia: 'operacao_uso'
};
let encerrado = false;
let emAndamento = false;
let temporizador;
let requisicao;
let graficoBarras;
let graficoPrevisao;
const formatoMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6
});

function moeda(valor) {
    return formatoMoeda.format(Number(valor));
}
function duracao(valor) {
    const segundos = Math.max(0, Math.floor(Number(valor) || 0));
    return `${Math.floor(segundos / 3600)} h ${Math.floor(segundos % 3600 / 60)} min ${segundos % 60} s`;
}

function prepararGraficos() {
    if (typeof Chart !== 'function') return false;
    const opcoes = {
        responsive: true, maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: contexto => `${contexto.dataset.label}: ${moeda(contexto.raw)}` } } },
        scales: { x: { ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, ticks: { callback: valor => moeda(valor) } } }
    };
    if (!graficoBarras) graficoBarras = new Chart(document.getElementById('graficoComponentes'), {
        type: 'bar', data: { labels: ['Rede'], datasets: [{ label: 'Acumulado observado (USD)', data: [null],
            backgroundColor: ['#3977d4', '#f2ad19', '#21836e'], borderRadius: 4, maxBarThickness: 54 }] },
        options: { ...opcoes, plugins: { ...opcoes.plugins, legend: { display: false } } }
    });
    if (!graficoPrevisao) graficoPrevisao = new Chart(document.getElementById('graficoPrevisao'), {
        type: 'line', data: { labels: [], datasets: [
            { label: 'Histórico diário observado', data: [], borderColor: '#3977d4', pointRadius: 2, spanGaps: false },
            { label: 'Previsão por regressão linear', data: [], borderColor: '#f2ad19', borderDash: [6, 4], pointRadius: 2, spanGaps: false }
        ] }, options: opcoes
    });
    return true;
}

function limparCustos() {
    for (const id of ['custoAcumulado', 'tempoExecucao', 'previsaoProximoMes', 'tendenciaCustos']) texto(id, null);
    texto('mesPrevisto', 'Aguardando histórico diário suficiente');
    texto('comparacaoPrevisao', 'Aguardando regressão linear');
    texto('statusGraficoComponentes', 'Aguardando custos.');
    texto('statusPrevisao', 'Aguardando previsão.');
    for (const grafico of [graficoBarras, graficoPrevisao]) {
        if (!grafico) continue;
        grafico.data.labels = grafico === graficoBarras ? ['Rede'] : [];
        for (const dataset of grafico.data.datasets) dataset.data = grafico === graficoBarras ? [null] : [];
        grafico.update('none');
    }
}

function renderizarCustos(custos) {
    limparCustos();
    if (!custos || custos.estado === 'indisponivel') {
        texto('statusGraficoComponentes', 'Custos indisponíveis.');
        return;
    }
    const componentes = custos.componentes || [];
    const custoRede = componentes.find(componente => componente.servico === 'Rede')?.valor;
    const servicos = custoRede == null ? 'EC2 + EBS' : 'EC2 + EBS + Rede';
    texto('mesCustos', `${custos.mes} · ${servicos} · mês UTC · estimativa parcial`);
    texto('custoAcumulado', custos.total === null ? null : moeda(custos.total));
    texto('tempoExecucao', custos.total === null ? null : duracao(custos.segundos_ec2));
    texto('statusGraficoComponentes', custos.total === null ? 'Aguardando custos.' : 'Custos atualizados.');
    const previsao = custos.previsao;
    if (previsao?.estado === 'disponivel') {
        texto('previsaoProximoMes', moeda(previsao.total));
        texto('mesPrevisto', `${previsao.mes} · mês completo previsto (UTC)`);
        texto('tendenciaCustos', previsao.tendencia);
        texto('comparacaoPrevisao', previsao.comparacao);
        texto('baseComparacaoPrevisao', previsao.comparacao);
        texto('statusPrevisao', 'Previsão calculada.');
    } else {
        texto('statusPrevisao', 'Histórico insuficiente para previsão.');
    }
    if (!prepararGraficos()) {
        texto('statusGraficoComponentes', 'Gráfico indisponível.');
        return;
    }
    if (componentes.length) {
        graficoBarras.data.labels = componentes.map(componente => componente.servico);
        graficoBarras.data.datasets[0].data = componentes.map(componente => componente.valor === null ? null : Number(componente.valor));
    }
    graficoBarras.update('none');
    const historico = new Map((custos.diario || []).map(diaRegistrado => [diaRegistrado.dia, diaRegistrado.total === null ? null : Number(diaRegistrado.total)]));
    const futuro = new Map((previsao?.serie || []).map(diaPrevisto => [diaPrevisto.dia, Number(diaPrevisto.valor)]));
    const datas = [...historico.keys(), ...futuro.keys()].sort();
    const labels = [];
    // Preenche as datas ausentes com null: lacunas não são desenhadas como custo zero.
    if (datas.length) {
        for (let instante = Date.parse(`${datas[0]}T00:00:00Z`), fim = Date.parse(`${datas.at(-1)}T00:00:00Z`); instante <= fim; instante += 86400000) {
            labels.push(new Date(instante).toISOString().slice(0, 10));
        }
    }
    graficoPrevisao.data.labels = labels;
    graficoPrevisao.data.datasets[0].data = labels.map(dia => historico.get(dia) ?? null);
    graficoPrevisao.data.datasets[1].data = labels.map(dia => futuro.get(dia) ?? null);
    graficoPrevisao.update('none');
}

function renderizarVolumes(inventario) {
    const corpo = document.getElementById('volumesEbs');
    corpo.replaceChildren();
    const volumes = inventario?.volumes_ebs;
    if (!Array.isArray(volumes) || !volumes.length) {
        const celula = corpo.insertRow().insertCell();
        celula.colSpan = 6;
        celula.textContent = Array.isArray(volumes) ? 'Nenhum volume anexado na última consulta.' : 'Inventário dos volumes indisponível.';
    } else {
        for (const volume of volumes) {
            const linha = corpo.insertRow();
            for (const campo of ['id', 'tipo', 'capacidade_gib', 'iops', 'throughput_mib_s', 'estado']) {
                linha.insertCell().textContent = volume[campo] ?? '—';
            }
        }
    }
    const capacidades = volumes?.map(volume => Number(volume.capacidade_gib));
    texto('capacidadeEbs', capacidades && capacidades.every(Number.isFinite)
        ? capacidades.reduce((total, valor) => total + valor, 0).toLocaleString('pt-BR') : null);
    texto('statusVolumes', inventario ? 'Configuração na data da consulta do inventário AWS.' : 'Aguardando consulta EC2/EBS com as permissões do laboratório.');
}

function renderizarMetricas(metricas = {}) {
    for (const [tipo, sufixo] of [['cpu', 'Cpu'], ['ram', 'Ram'], ['disco', 'Disco']]) {
        const leitura = metricas[tipo];
        texto(`utilizacao${sufixo}`, leitura ? `${Number(leitura.valor).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : null);
        texto(`captura${sufixo}`, leitura ? `${leitura.capturado_em_local}${leitura.desatualizada ? ' · leitura antiga' : ''}` : 'Sem leitura cadastrada em %');
        document.getElementById(`utilizacao${sufixo}`).classList.toggle('dado_antigo', Boolean(leitura?.desatualizada));
    }
}

function limpar() {
    limparCustos();
    for (const id of [...Object.keys(camposInstancia), 'nomeMaquina', 'idInstancia']) texto(id, null);
    texto('statusInventario', 'Inventário indisponível.');
    renderizarMetricas();
    renderizarVolumes(null);
}

function renderizar(dados) {
    const instancia = { ...dados.identidade, ...dados.inventario?.instancia };
    texto('nomeMaquina', dados.maquina.nome);
    texto('idInstancia', dados.identidade.id);
    for (const [id, campo] of Object.entries(camposInstancia)) texto(id, instancia[campo]);
    const estados = {
        atualizado: 'Inventário AWS disponível.',
        desatualizado: 'Inventário antigo: a configuração exibida pode ter mudado.',
        indisponivel: 'Inventário AWS indisponível; exibindo apenas a identidade da EC2.',
        nao_consultado: 'Modo somente metadados: configuração EC2/EBS não consultada.'
    };
    const statusInventario = estados[dados.estado_inventario] || 'Estado do inventário desconhecido.';
    const avisoCaptura = dados.captura_desatualizada ? ' Registros da EC2 desatualizados.' : '';
    texto('statusInventario', `${statusInventario}${avisoCaptura} ${dados.erro_inventario || ''}`.trim());
    renderizarMetricas(dados.metricas);
    renderizarVolumes(dados.inventario);
    renderizarCustos(dados.custos);
}

async function atualizar() {
    if (encerrado || emAndamento || document.hidden) return;
    if (sessionStorage.getItem('FKCARGO_USUARIO') !== '4') {
        encerrado = true;
        window.location.replace('/login.html');
        return;
    }
    const inicioConsulta = Date.now();
    emAndamento = true;
    requisicao = new AbortController();
    const limite = setTimeout(() => requisicao.abort(), 15000);
    try {
        const resposta = await fetch('/custos/monitoramento', { signal: requisicao.signal });
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro || 'Falha ao consultar as capturas.');
        if (dados.estado === 'aguardando') {
            limpar();
            texto('statusInventario', dados.mensagem);
            return;
        }
        renderizar(dados);
    } catch (erro) {
        limpar();
        texto('statusInventario', erro.name === 'AbortError' ? 'A consulta ao banco demorou demais. Uma nova tentativa será feita.' : erro.message);
    } finally {
        clearTimeout(limite);
        emAndamento = false;
        if (!encerrado && !document.hidden) temporizador = setTimeout(atualizar, Math.max(0, 10000 - (Date.now() - inicioConsulta)));
    }
}

function atualizarAoVoltarParaAba() {
    clearTimeout(temporizador);
    if (!document.hidden) atualizar();
}

function pausarAoSairDaPagina() {
    encerrado = true;
    clearTimeout(temporizador);
    requisicao?.abort();
}

function retomarAoVoltarParaPagina(evento) {
    if (!evento.persisted) return;
    encerrado = false;
    atualizar();
}

function sair() {
    pausarAoSairDaPagina();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login.html';
}

document.addEventListener('visibilitychange', atualizarAoVoltarParaAba);
window.addEventListener('pagehide', pausarAoSairDaPagina);
window.addEventListener('pageshow', retomarAoVoltarParaPagina);
document.getElementById('btn_logout').addEventListener('click', sair);
atualizar();
