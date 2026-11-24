var express = require("express");
var router = express.Router();

var previsaoController = require("../controllers/previsaoController");

// GET /previsao/disco/:idEmpresa?dias=30
router.get("/disco/:idEmpresa", function (req, res) {
    previsaoController.listarDisco(req, res);
});

module.exports = router;
