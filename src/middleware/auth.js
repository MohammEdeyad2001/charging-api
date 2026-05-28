const admin = require('../firebase'); // 💡 تعديل المسار ليتناسب مع ملفك الحالي
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '❌ يجب تسجيل الدخول أولاً، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. التحقق من توكن الفايربيز
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // 2. البحث عن صاحب المحطة في قاعدة البيانات المحلية بواسطة firebase_uid
    let owner = await pool.query(
      'SELECT id, name, email, firebase_uid FROM owner WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    // 3. إذا لم يوجد (مثلاً سجل لأول مرة في الفايربيز ولم يخزن محلياً)، يتم إنشاؤه تلقائياً
    if (owner.rows.length === 0) {
      const newOwner = await pool.query(
        'INSERT INTO owner (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING id, name, email, firebase_uid',
        [decodedToken.name || decodedToken.email.split('@')[0], decodedToken.email, decodedToken.uid]
      );
      owner = { rows: [newOwner.rows[0]] };
    }

    // 4. نضع كائن الـ owner داخل الـ req لتستخدمه بقية الـ Controllers بكفاءة
    req.owner = owner.rows[0]; 
    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '❌ انتهت صلاحية التوكن، الرجاء إعادة تسجيل الدخول' });
    }
    return res.status(401).json({ message: '❌ توكن غير صالح أو غير مصرح به', error: err.message });
  }
};

module.exports = authMiddleware;