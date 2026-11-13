var express = require("express");
var router = express.Router();

var alertaController = require("../controllers/alertaController");

router.get("/listarAlerta/:idEmpresa", function (req, res) {
    alertaController.listarAlerta(req, res);
});

router.put("/marcarCiente/:idDiscretizada", function (req, res) {
    alertaController.marcarCiente(req, res);
});



module.exports = router; 