var express = require("express");
var router = express.Router();

var quizController = require("../controllers/quizController");

// Rota que vai receber o POST do Frontend no endereço /quiz/registrar
router.post("/registrar", function (req, res) {
    quizController.registrarResposta(req, res);
});

module.exports = router;
