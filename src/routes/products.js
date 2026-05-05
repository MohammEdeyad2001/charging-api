const express = require('express');
const router = express.Router();
const { getAllProducts, addProduct, updateProduct } = require('../controllers/productController');

router.get('/', getAllProducts);
router.post('/', addProduct);
router.put('/:id', updateProduct);

module.exports = router;