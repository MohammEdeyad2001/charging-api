// src/routes/shelves.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllShelves,
  addShelf,
  addMultipleShelves,
  deleteShelf,
  deleteShelfByNumber
} = require('../controllers/shelfController');

router.use(auth);

router.post('/bulk', addMultipleShelves);
router.delete('/by-number/:number', deleteShelfByNumber);
router.get('/', getAllShelves);
router.post('/', addShelf);
router.delete('/:id', deleteShelf);

module.exports = router;