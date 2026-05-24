const express = require('express');
const router = express.Router();
const { getAllShelves, addShelf, addMultipleShelves, deleteShelf } = require('../controllers/shelfController');
router.post('/bulk', addMultipleShelves);
router.get('/', getAllShelves);
router.post('/', addShelf);
router.delete('/:id', deleteShelf);

module.exports = router;
