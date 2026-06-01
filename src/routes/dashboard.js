// src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDashboard } = require('../controllers/dashboardController');

router.use(auth);

router.get('/', getDashboard);

module.exports = router;
