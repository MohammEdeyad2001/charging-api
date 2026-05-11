const express = require('express');
const router = express.Router();
const { getAllCustomers, getCustomerById, payDebt, getDebtHistory, deleteCustomer } = require('../controllers/customerController');

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.put('/:id/pay', payDebt);
router.get('/:id/debt-history', getDebtHistory);
router.delete('/:id', deleteCustomer);

module.exports = router;
