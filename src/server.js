const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const pool = require('./config/db');
const authMiddleware = require('./middleware/auth');
require('./config/firebase');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const shelvesRoutes = require('./routes/shelves');

app.use('/auth', authRoutes);
app.use('/customers', authMiddleware, customerRoutes);
app.use('/transactions', authMiddleware, transactionRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/products', authMiddleware, productRoutes);
app.use('/shelves', authMiddleware, shelvesRoutes);

const PORT = process.env.PORT || 3000;

// 💡 قمنا بإزالة دالة runMigrations من هنا لتجنب أي تعارض في السيرفر الخارجي

app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل بنجاح على المنفذ ${PORT}`);
  console.log(`🚀 نظام نقطة الشحن جاهز وعامل على الـ Production!`);
});