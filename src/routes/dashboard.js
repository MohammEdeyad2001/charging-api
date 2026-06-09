// src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDashboard, getDebtors, getCustomersWithBalance } = require('../controllers/dashboardController');

router.use(auth);

router.get('/', getDashboard);

// العملاء الذين عليهم ديون (للضغط على "إظهار التفاصيل" في الديون الخارجية)
router.get('/debtors', getDebtors);

// العملاء الذين لهم رصيد موجب (للضغط على "إظهار التفاصيل" في أرصدة العملاء)
router.get('/customers-with-balance', getCustomersWithBalance);

module.exports = router;