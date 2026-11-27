var express = require("express");
var router = express.Router();

var maquinasController = require("../controllers/maquinasController");

//Recebendo os dados do html e direcionando para a função cadastrar de usuarioController.js
router.post("/cadastrarMaquina", function (req, res) {
    maquinasController.cadastrarMaquina(req, res);
})

router.post("/cadastrarComponente", function (req, res) {
    maquinasController.cadastrarComponente(req, res);
});

router.post("/listar", function (req, res) {
  maquinasController.listar(req, res);
});

router.get("/listarMaquinas/:fk", function (req, res) {
    maquinasController.listarMaquinas(req, res);
});

router.get("/buscar/:idConfigMaq", function (req, res) {
    maquinasController.buscarMaquinaPorId(req, res);
});

router.put("/atualizar/:id/:idConfigMaq", function (req, res) {
    maquinasController.atualizarMaquina(req, res);
});

// Edição da máquina com os componentes dela
router.get("/detalhe/:idMaquina", function (req, res) {
    maquinasController.detalheMaquina(req, res);
});

router.put("/atualizarCompleta/:idMaquina", function (req, res) {
    maquinasController.atualizarMaquinaCompleta(req, res);
});

module.exports = router;