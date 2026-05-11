const express = require('express');
const router = express.Router();
const { createTransaction, deliverTransaction, getAllTransactions, getTodayTransactions, getWeekTransactions, getMonthTransactions, getRangeTransactions, deleteTransaction } = require('../controllers/transactionController');

router.get('/', getAllTransactions);
router.post('/', createTransaction);
router.put('/:id/deliver', deliverTransaction);
router.get('/today', getTodayTransactions);
router.get('/week', getWeekTransactions);
router.get('/month', getMonthTransactions);
router.get('/range', getRangeTransactions);
router.delete('/:id', deleteTransaction);

module.exports = router;