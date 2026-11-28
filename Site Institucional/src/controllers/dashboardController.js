var dashboardModel = require("../models/dashboardModel");
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
        dashboardModel.buscarMaquina(idEmpresa, idMaquina),
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

module.exports = { visaoGeral, detalheMaquina };