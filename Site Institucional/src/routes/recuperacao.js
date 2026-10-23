var express = require("express");
var router = express.Router();

var recuperacaoController = require("../controller/recuperacaoController");

router.post("/verificar-email", recuperacaoController.verificarEmail);

router.post(
    "/verificar-nascimento",
    recuperacaoController.verificarNascimento
);

router.post(
    "/redefinir-senha",
    recuperacaoController.redefinirSenha
);

module.exports = router;