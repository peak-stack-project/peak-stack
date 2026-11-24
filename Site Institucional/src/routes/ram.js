var express = require("express");
var router = express.Router();
var { exec } = require("child_process");
var path = require("path");

var ramController = require("../controllers/ramController");

router.get("/servidores/:idEmpresa", function (req, res) {
    ramController.listarServidores(req, res);
});

router.get("/kpis/:idMaquina", function (req, res) {
    ramController.buscarKPIs(req, res);
});

router.get("/historico/:idMaquina", function (req, res) {
    ramController.buscarHistoricoRam(req, res);
});

router.get("/vazamento/:idMaquina", function (req, res) {
    ramController.buscarSerieVazamento(req, res);
});

router.get("/dispersao/:idMaquina", function (req, res) {
    ramController.buscarDispersaoRede(req, res);
});

router.post("/relatorio/enviar", function (req, res) {
    var scriptPath  = path.join(__dirname, "../../../../Python/relatorio_ram.py");
    var venvPython  = path.join(__dirname, "../../../../Python/venv/Scripts/python.exe");

    exec(`"${venvPython}" "${scriptPath}"`, function (erro, stdout, stderr) {
        if (erro) {
            console.error("Erro ao executar relatório RAM:", stderr);
            return res.status(500).json({ mensagem: "Erro ao enviar relatório.", detalhe: stderr });
        }
        console.log(stdout);
        res.status(200).json({ mensagem: "Relatório enviado com sucesso!" });
    });
});

module.exports = router;