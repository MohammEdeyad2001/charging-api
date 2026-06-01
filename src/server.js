// src/server.js
require('dotenv').config(); // يجب تحميل المتغيرات البيئية أولاً

const express = require('express');
const cors = require('cors');

// تهيئات تعتمد على المتغيرات البيئية يجب استدعاؤها بعد dotenv.config()
const pool = require('./config/db');
require('./config/firebase'); // تهيئة firebase-admin

const app = express();
app.use(cors());
app.use(express.json());

// Routes
// اختر نمط مسارات موحّد (هنا استخدمت /api/*)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/shelves', require('./routes/shelves'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});
