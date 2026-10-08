// Dados e funções usadas por máquinas.html (lista) e maquina.html (detalhe).
// Os dados abaixo são de exemplo: quando a API estiver pronta, substitua MAQUINAS
// pelo resultado do fetch (cada máquina com id, nome, ip, so, empresa, cpu, ram, disco, status,
// eventos e historico).

// Gera 24 pontos (00h–23h) de exemplo terminando no valor atual.
function gerarHistorico(atual, amplitude, semente, offline) {
    const pontos = [];
    for (let h = 0; h < 24; h++) {
        const onda = Math.sin(h * 0.55 + semente) + 0.5 * Math.sin(h * 1.3 + semente * 2);
        let v = atual - amplitude + amplitude * 0.9 * (onda + 1) / 2 * (h / 23 + 0.4);
        pontos.push(Math.max(2, Math.min(98, Math.round(v))));
    }
    pontos[23] = atual;
    if (offline) for (let h = 17; h < 24; h++) pontos[h] = 0;
    return pontos;
}

const MAQUINAS = [
    {
        id: 1, nome: 'SRV-PROD-01', ip: '192.168.1.10', so: 'Ubuntu 22.04', empresa: 'Sympla',
        cpu: 32, ram: 67, disco: 45, status: 'online',
        historico: { cpu: gerarHistorico(32, 14, 1), ram: gerarHistorico(67, 8, 2) },
        eventos: [
            { hora: '12:05', tipo: 'info', texto: 'Coleta de métricas iniciada normalmente' },
            { hora: '08:00', tipo: 'ok',   texto: 'Servidor iniciado com sucesso' }
        ]
    },
    {
        id: 2, nome: 'SRV-PROD-02', ip: '192.168.1.11', so: 'CentOS 8', empresa: 'Sympla',
        cpu: 91, ram: 82, disco: 87, status: 'atencao',
        historico: { cpu: gerarHistorico(91, 40, 3), ram: gerarHistorico(82, 14, 4) },
        eventos: [
            { hora: '14:32', tipo: 'alerta', texto: 'CPU atingiu 91% por mais de 5 minutos' },
            { hora: '13:10', tipo: 'info',   texto: 'Agente de monitoramento reconectado' },
            { hora: '11:45', tipo: 'info',   texto: 'Coleta de métricas iniciada normalmente' },
            { hora: '08:00', tipo: 'ok',     texto: 'Servidor iniciado com sucesso' }
        ]
    },
    {
        id: 3, nome: 'SRV-API-01', ip: '10.0.1.5', so: 'Debian 11', empresa: 'Ingresso.com',
        cpu: 28, ram: 55, disco: 62, status: 'online',
        historico: { cpu: gerarHistorico(28, 12, 5), ram: gerarHistorico(55, 8, 6) },
        eventos: [
            { hora: '10:20', tipo: 'info', texto: 'Coleta de métricas iniciada normalmente' },
            { hora: '08:00', tipo: 'ok',   texto: 'Servidor iniciado com sucesso' }
        ]
    },
    {
        id: 4, nome: 'SRV-DB-01', ip: '10.0.1.6', so: 'Windows Server 2022', empresa: 'Ingresso.com',
        cpu: 0, ram: 0, disco: 93, status: 'offline',
        historico: { cpu: gerarHistorico(30, 10, 7, true), ram: gerarHistorico(60, 6, 8, true) },
        eventos: [
            { hora: '16:48', tipo: 'critico', texto: 'Servidor sem resposta do agente de monitoramento' },
            { hora: '15:30', tipo: 'alerta',  texto: 'Disco atingiu 93% de uso' },
            { hora: '08:00', tipo: 'ok',      texto: 'Servidor iniciado com sucesso' }
        ]
    }
];

const ROTULOS = { online: 'Online', atencao: 'Atenção', offline: 'Offline' };

const ICONES = {
    monitor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
    ram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="10" rx="1.5"/><path d="M6 11v2M10 11v2M14 11v2M18 11v2M6 17v2M18 17v2"/></svg>',
    disco: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 14h18l-2.2-8.2A2 2 0 0 0 16.9 4H7.1a2 2 0 0 0-1.9 1.8z"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 17h.01"/></svg>',
    online: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="0.5"/></svg>',
    atencao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    offline: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a15 15 0 0 1 5-3M22 9a15 15 0 0 0-8-3.8M5.5 12.5A10 10 0 0 1 9 10.6M18.5 12.5a10 10 0 0 0-2-1.5M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="0.5"/><path d="m2 2 20 20"/></svg>',
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
    excluir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/></svg>'
};

// Escapa texto para não injetar HTML caso os dados venham de uma API.
function esc(texto) {
    const el = document.createElement('div');
    el.textContent = texto;
    return el.innerHTML;
}

// < 65% azul | 65–84% laranja | >= 85% vermelho | 0 neutro
function nivel(valor) {
    if (valor === 0) return 'nivel_zero';
    if (valor >= 85) return 'nivel_critico';
    if (valor >= 65) return 'nivel_alerta';
    return 'nivel_ok';
}