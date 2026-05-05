const express = require('express');
const dotenv = require('dotenv');
const pool = require('./config/db');
const authMiddleware = require('./middleware/auth');

dotenv.config();

const app = express();

app.use(express.json());

// الـ Routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const shelvesRoutes = require('./routes/shelves');

// بدون حماية
app.use('/auth', authRoutes);

// مع حماية - يجب تسجيل الدخول
app.use('/customers', authMiddleware, customerRoutes);
app.use('/transactions', authMiddleware, transactionRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/products', authMiddleware, productRoutes);
app.use('/shelves', authMiddleware, shelvesRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
});