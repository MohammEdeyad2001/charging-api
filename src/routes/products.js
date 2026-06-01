// src/routes/products.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

router.use(auth);

router.get('/', getAllProducts);
router.post('/', addProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
