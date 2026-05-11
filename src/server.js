const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // استدعاء حزمة CORS لحل مشكلة التقييد
const pool = require('./config/db');
const authMiddleware = require('./middleware/auth');

// تحميل إعدادات البيئة من ملف .env
dotenv.config();

const app = express();

// تفعيل CORS للسماح للواجهة الأمامية (Browser/Flutter Web) بالاتصال بالسيرفر
app.use(cors());

// السماح للسيرفر بقراءة ومعالجة بيانات JSON الواردة في الطلبات
app.use(express.json());

// استيراد المسارات (Routes) من المجلد الخاص بها
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const shelvesRoutes = require('./routes/shelves');

// إعداد المسارات العامة (لا تتطلب تسجيل دخول)
app.use('/auth', authRoutes);

// إعداد المسارات المحمية (تتطلب وجود Token صالح في الـ Header)
app.use('/customers', authMiddleware, customerRoutes);
app.use('/transactions', authMiddleware, transactionRoutes);
app.use('/dashboard', authMiddleware, dashboardRoutes);
app.use('/products', authMiddleware, productRoutes);
app.use('/shelves', authMiddleware, shelvesRoutes);

// تحديد منفذ التشغيل (من ملف البيئة أو افتراضياً 3000)
const PORT = process.env.PORT || 3000;

// تشغيل السيرفر والاستماع للطلبات
app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل بنجاح على المنفذ ${PORT}`);
  console.log(`🚀 نظام نقطة الشحن جاهز الآن لاستقبال الطلبات من الواجهة الأمامية`);
});