var express = require("express");
var router = express.Router();

var recuperacaoController = require("../controllers/recuperacaoController");

router.post("/verificar-email", recuperacaoController.verificarEmail);

router.post(
    "/verificar-nascimento",
    recuperacaoController.verificarNascimento
);

router.put(
    "/redefinir-senha",
    recuperacaoController.redefinirSenha
);

module.exports = router;