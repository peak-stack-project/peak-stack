var express = require("express");
var router = express.Router();

var dashboardController = require("../controllers/dashboardController");
var latenciaController = require("../controllers/latenciaController");

router.get("/visaoGeral/:idEmpresa", function (req, res) {
    dashboardController.visaoGeral(req, res);
});

router.get("/maquina/:idEmpresa/:idMaquina", function (req, res) {
    dashboardController.detalheMaquina(req, res);
});

// Gráfico de latência da Visão geral (?maquina=ID opcional)
router.get("/latencia/:idEmpresa", function (req, res) {
    latenciaController.latencia24h(req, res);
});

module.exports = router;