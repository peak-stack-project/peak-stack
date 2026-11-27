var dashboardModel = require("../models/dashboardRedeModel");
var maquinasModel = require("../models/maquinasModel");

var LIMITE_OFFLINE_SEG = 60;
var PESO = { Normal: 0, Alerta: 1, "Crítico": 2 };

// Transforma as linhas do banco em { idMaquina: {cpu, ram, disco, status, offline...} }
function agruparPorMaquina(linhas) {
    var mapa = {};
    linhas.forEach(function (l) {
        var s = mapa[l.idMaquina] || (mapa[l.idMaquina] = {
            idMaquina: l.idMaquina, servidor: l.servidor, empresa: l.empresa,
            cpu: null, ram: null, disco: null,
            status: "Normal", segundos: Number(l.segundos), pior: null
        });
        var tipo = String(l.tipo).toLowerCase();
        if (tipo === "cpu" || tipo === "ram" || tipo === "disco") s[tipo] = Number(l.valor);

        s.segundos = Math.min(s.segundos, Number(l.segundos));
        var sit = l.situacao || "Normal";
        if (PESO[sit] >= PESO[s.status] && sit !== "Normal") {
            s.status = sit;
            s.pior = { tipo: l.tipo, valor: Number(l.valor) };
        }
    });
    return Object.values(mapa).map(function (s) {
        s.offline = s.segundos > LIMITE_OFFLINE_SEG;
        return s;
    });
}

// Quantos minutos o histórico em tempo real mostra (a captura grava a cada 5s)
var JANELA_MINUTOS = 5;

function pivotarTempoReal(linhas) {
    var labels = [], cpu = {}, ram = {};
    linhas.forEach(function (r) {
        if (labels.indexOf(r.hora) === -1) labels.push(r.hora);
        (r.tipo === "CPU" ? cpu : ram)[r.hora] = Number(r.valor);
    });
    return {
        labels: labels,
        cpu: labels.map(function (h) { return h in cpu ? cpu[h] : null; }),
        ram: labels.map(function (h) { return h in ram ? ram[h] : null; })
    };
}

function pivotarSerie(linhas) {
    var labels = [], cpu = {}, ram = {};
    linhas.forEach(function (r) {
        if (labels.indexOf(r.minuto) === -1) labels.push(r.minuto);
        (r.tipo === "CPU" ? cpu : ram)[r.minuto] = Number(r.media);
    });
    return {
        labels: labels,
        cpu: labels.map(function (m) { return m in cpu ? cpu[m] : null; }),
        ram: labels.map(function (m) { return m in ram ? ram[m] : null; })
    };
}

function visaoGeral(req, res) {
    var idEmpresa = req.params.idEmpresa;
    if (idEmpresa == undefined) {
        return res.status(400).send("O idEmpresa está indefinido!");
    }

    Promise.all([
        dashboardModel.ultimasLeituras(idEmpresa),
        dashboardModel.serieRecente(idEmpresa)
    ]).then(function (r) {
        var servidores = agruparPorMaquina(r[0]);
        servidores.sort(function (a, b) {
            return ((b.cpu || 0) + (b.ram || 0) + (b.disco || 0)) -
                   ((a.cpu || 0) + (a.ram || 0) + (a.disco || 0));
        });

        var status = { Normal: 0, Alerta: 0, "Crítico": 0 };
        servidores.forEach(function (s) { status[s.status]++; });

        var respondendo = servidores.filter(function (s) { return !s.offline; }).length;
        var critica = servidores.find(function (s) { return s.status === "Crítico"; }) || null;

        res.json({
            servidores: servidores,
            status: status,
            disponibilidade: servidores.length ? Math.round(1000 * respondendo / servidores.length) / 10 : null,
            maquinaCritica: critica,
            serie: pivotarSerie(r[1])
        });
    }).catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage || String(erro));
    });
}

function detalheMaquina(req, res) {
    var idEmpresa = req.params.idEmpresa;
    var idMaquina = req.params.idMaquina;

    Promise.all([
        maquinasModel.buscarMaquinaPorId(idMaquina),  
        dashboardModel.ultimasLeituras(idEmpresa, idMaquina),
        dashboardModel.historicoTempoReal(idEmpresa, idMaquina, JANELA_MINUTOS),
        dashboardModel.eventosRecentes(idEmpresa, idMaquina)
    ]).then(function (r) {
        if (r[0].length === 0) return res.status(404).send("Máquina não encontrada");

        var cadastro = r[0][0];
        var atual = agruparPorMaquina(r[1])[0] || { cpu: 0, ram: 0, disco: 0, status: "Normal", offline: true };

        // maquinas_comum.js só conhece online / atencao / offline
        var status = atual.offline ? "offline" : (atual.status === "Normal" ? "online" : "atencao");

        res.json({
            id: Number(idMaquina),
            nome: cadastro.nome,
            mac: cadastro.mac,
            so: cadastro.sistema_operacional,
            empresa: cadastro.nome_fantasia,
            status: status,
            cpu: atual.cpu || 0, ram: atual.ram || 0, disco: atual.disco || 0,
            historico: pivotarTempoReal(r[2]),
            eventos: r[3].map(function (e) {
                return {
                    hora: e.hora,
                    tipo: e.situacao === "Crítico" ? "critico" : "alerta",
                    texto: e.tipo + " em " + e.situacao + " (pico de " + Number(e.pico) + "%)"
                };
            })
        });
    }).catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage || String(erro));
    });
}

var LIMITE_SYN_ALERTA = 20;
var LIMITE_SYN_CRITICO = 50;

function agruparRedePorMaquina(linhas) {
    var mapa = {};
    linhas.forEach(function (l) {
        var s = mapa[l.idMaquina] || (mapa[l.idMaquina] = {
            idMaquina: l.idMaquina,
            servidor: l.servidor,
            empresa: l.empresa,
            conexoes: 0,
            established: 0,
            timeWait: 0,
            closeWait: 0,
            syn: 0,
            portas: 0,
            download: 0,
            upload: 0,
            status: "Normal",
            segundos: Number(l.segundos)
        });

        var val = Number(l.valor) || 0;
        if (l.codigo === "total") s.conexoes = val;
        else if (l.codigo === "established") s.established = val;
        else if (l.codigo === "time_wait") s.timeWait = val;
        else if (l.codigo === "close_wait") s.closeWait = val;
        else if (l.codigo === "syn_recv") s.syn = val;
        else if (l.codigo === "portas_abertas") s.portas = val;
        else if (l.codigo === "download_mbps") s.download = val;
        else if (l.codigo === "upload_mbps") s.upload = val;

        s.segundos = Math.min(s.segundos, Number(l.segundos));

        var sit = l.situacao || "Normal";
        if (PESO[sit] > PESO[s.status]) {
            s.status = sit;
        }
    });

    return Object.values(mapa).map(function (s) {
        if (s.syn >= LIMITE_SYN_CRITICO) s.status = "Crítico";
        else if (s.syn >= LIMITE_SYN_ALERTA && PESO[s.status] < PESO.Alerta) s.status = "Alerta";

        s.offline = s.segundos > LIMITE_OFFLINE_SEG;
        return s;
    });
}

function montarBaseline(linhas) {
    var base = { total: {}, novas_conexoes: {} };
    linhas.forEach(function (r) {
        if (base[r.codigo]) {
            base[r.codigo][Number(r.hora)] = {
                media: Number(r.media) || 0,
                desvio: Number(r.desvio) || 0
            };
        }
    });
    return base;
}

function pivotarSerieRede(linhas, baselineTotal) {
    var rotulos = [];
    var horaPorMinuto = {};
    var conexoes = {};
    var novas = {};

    linhas.forEach(function (r) {
        if (rotulos.indexOf(r.minuto) === -1) {
            rotulos.push(r.minuto);
            horaPorMinuto[r.minuto] = Number(r.hora);
        }
        if (r.codigo === "total") conexoes[r.minuto] = Number(r.valor);
        if (r.codigo === "novas_conexoes") novas[r.minuto] = Number(r.valor);
    });

    return {
        rotulos: rotulos,
        conexoes: rotulos.map(function (m) { return m in conexoes ? conexoes[m] : null; }),
        novas: rotulos.map(function (m) { return m in novas ? novas[m] : null; }),
        limite: rotulos.map(function (m) {
            var b = baselineTotal[horaPorMinuto[m]];
            return b ? Math.round(b.media + 2 * b.desvio) : null;
        })
    };
}

function seguranca(req, res) {
    var idEmpresa = Number(req.params.idEmpresa);
    if (!idEmpresa || isNaN(idEmpresa)) {
        return res.status(400).send("O idEmpresa está inválido!");
    }

    Promise.all([
        dashboardModel.ultimasLeiturasRede(idEmpresa),
        dashboardModel.serieRedeRecente(idEmpresa),
        dashboardModel.baselineRedePorHora(idEmpresa),
        dashboardModel.portasNovasUltimaHora(idEmpresa),
        dashboardModel.eventosRedeRecentes(idEmpresa)
    ]).then(function (r) {
        var servidores = agruparRedePorMaquina(r[0]);
        servidores.sort(function (a, b) {
            return (PESO[b.status] - PESO[a.status]) ||
                   (b.syn - a.syn) ||
                   (b.conexoes - a.conexoes);
        });

        var baseline = montarBaseline(r[2]);
        var serie = pivotarSerieRede(r[1], baseline.total);

        var totalConexoes = 0;
        var totalSyn = 0;
        var totalPortas = 0;
        var estados = { established: 0, timeWait: 0, closeWait: 0, synRecv: 0, outras: 0 };

        servidores.forEach(function (s) {
            totalConexoes += s.conexoes;
            totalSyn += s.syn;
            totalPortas += s.portas;
            estados.established += s.established;
            estados.timeWait += s.timeWait;
            estados.closeWait += s.closeWait;
            estados.synRecv += s.syn;
        });

        var somaEstados = estados.established + estados.timeWait + estados.closeWait + estados.synRecv;
        estados.outras = Math.max(0, totalConexoes - somaEstados);

        var ultimaLinhaSerie = r[1].length ? r[1][r[1].length - 1] : null;
        var horaAtual = ultimaLinhaSerie ? Number(ultimaLinhaSerie.hora) : new Date().getHours();
        var baseTotalAtual = baseline.total[horaAtual];
        var baseNovasAtual = baseline.novas_conexoes[horaAtual];

        var variacaoConexoes = null;
        if (servidores.length > 0 && baseTotalAtual && baseTotalAtual.media > 0) {
            variacaoConexoes = Math.round(((totalConexoes - baseTotalAtual.media) / baseTotalAtual.media) * 100);
        }

        var novasPorMinuto = null;
        for (var i = serie.novas.length - 1; i >= 0; i--) {
            if (serie.novas[i] != null) {
                novasPorMinuto = serie.novas[i];
                break;
            }
        }

        var trafego = servidores
            .slice()
            .sort(function (a, b) { return (b.download + b.upload) - (a.download + a.upload); })
            .slice(0, 10)
            .map(function (s) {
                return { servidor: s.servidor, download: s.download, upload: s.upload };
            });

        var portasNovas = r[3].length ? Number(r[3][0].portasNovas) : 0;

        res.json({
            kpis: {
                conexoes: servidores.length ? totalConexoes : null,
                variacaoConexoes: variacaoConexoes,
                novasPorMinuto: novasPorMinuto,
                mediaNovasPorMinuto: baseNovasAtual ? Math.round(baseNovasAtual.media) : null,
                syn: servidores.length ? totalSyn : null,
                portasAbertas: servidores.length ? totalPortas : null,
                portasNovas: portasNovas
            },
            serie: serie,
            estados: estados,
            trafego: trafego,
            servidores: servidores.map(function (s) {
                return {
                    idMaquina: s.idMaquina,
                    servidor: s.servidor,
                    empresa: s.empresa,
                    conexoes: s.conexoes,
                    syn: s.syn,
                    portas: s.portas,
                    status: s.status,
                    offline: s.offline
                };
            }),
            eventos: r[4].map(function (e) {
                return {
                    hora: e.hora,
                    nivel: e.situacao,
                    texto: e.componente + " em " + e.situacao + " (" + e.servidor + ": " + Number(e.pico) + ")"
                };
            })
        });
    }).catch(function (erro) {
        console.log(erro);
        res.status(500).json(erro.sqlMessage || String(erro));
    });
}

module.exports = { visaoGeral, detalheMaquina, seguranca };