const express = require("express")
const router = express.Router()
const {handleStation} = require("../controllers/station")
router.get('/recorded',handleStation)

module.exports = router