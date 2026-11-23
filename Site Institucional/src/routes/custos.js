const router = require("express").Router();
const controller = require("../controllers/custosController");

router.get("/monitoramento", controller.consultar);

module.exports = router;
