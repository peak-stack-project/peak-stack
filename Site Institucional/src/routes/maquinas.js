var express = require("express");
var router = express.Router();

var maquinasController = require("../controllers/maquinasController");

//Recebendo os dados do html e direcionando para a função cadastrar de usuarioController.js
router.post("/cadastrarMaquina", function (req, res) {
    maquinasController.cadastrarMaquina(req, res);
})

router.post("/cadastrarComponente", function (req, res) {
    maquinasController.buscarPorCnpj(req, res);
});

router.post("/listar", function (req, res) {
  maquinasController.listar(req, res);
});

module.exports = router;