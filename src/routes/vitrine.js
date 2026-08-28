var express = require("express");
var router = express.Router();

var vitrineController = require("../controllers/vitrineController");

router.post("/avaliar", function (req, res) {
    vitrineController.avaliar(req, res);


});

module.exports = router;
