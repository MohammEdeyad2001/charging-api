const express = require('express');
const router = express.Router();
const { getAllShelves } = require('../controllers/shelfController');

router.get('/', getAllShelves);

module.exports = router;