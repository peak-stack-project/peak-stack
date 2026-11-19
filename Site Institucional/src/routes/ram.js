var express = require("express");
var router = express.Router();

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

module.exports = router;