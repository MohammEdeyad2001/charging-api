const express = require('express');
const router = express.Router();
const { getAllShelves, addShelf, deleteShelf } = require('../controllers/shelfController');

router.get('/', getAllShelves);
router.post('/', addShelf);
router.delete('/:id', deleteShelf);

module.exports = router;
