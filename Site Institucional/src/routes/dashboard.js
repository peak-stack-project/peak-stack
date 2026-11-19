var express = require("express");
var router = express.Router();

var dashboardController = require("../controllers/dashboardController");

router.get("/visaoGeral/:idEmpresa", function (req, res) {
    dashboardController.visaoGeral(req, res);
});

router.get("/maquina/:idEmpresa/:idMaquina", function (req, res) {
    dashboardController.detalheMaquina(req, res);
});

module.exports = router;