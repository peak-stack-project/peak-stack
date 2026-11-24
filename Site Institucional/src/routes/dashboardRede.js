var express = require("express");
var router = express.Router();

var dashboardRedeController = require("../controllers/dashboardRedeController");

router.get("/seguranca/:idEmpresa", function (req, res) {
    dashboardRedeController.seguranca(req, res);
});

module.exports = router;