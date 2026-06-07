// src/routes/customers.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getAllCustomers,
  getCustomerById,
  payDebt,
  getDebtHistory,
  deleteCustomer,
  getAllPayments
} = require('../controllers/customerController');

router.use(auth);

router.get('/', getAllCustomers);
router.get('/payments/all', getAllPayments);
router.get('/:id', getCustomerById);
router.put('/:id/pay', payDebt);
router.get('/:id/debt-history', getDebtHistory);
router.delete('/:id', deleteCustomer);

module.exports = router;