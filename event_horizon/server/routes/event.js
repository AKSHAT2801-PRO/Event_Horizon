const express = require("express");
const router = express.Router();
const {handleSearchEvent} = require('../controllers/events')


router.get('/',handleSearchEvent)

module.exports = router