const express = require('express');
const router = express.Router();
const { getAllCustomers, getCustomerById, payDebt, getDebtHistory } = require('../controllers/customerController');

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.put('/:id/pay', payDebt);
router.get('/:id/debt-history', getDebtHistory);

module.exports = router;