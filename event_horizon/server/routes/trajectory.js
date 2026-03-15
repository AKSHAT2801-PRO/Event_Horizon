const express = require("express");
const router = express.Router();
const {handleMeteorData} = require("../controllers/trajectory")
router.get('/trajectory',handleMeteorData)



module.exports = router