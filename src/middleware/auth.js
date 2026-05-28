const path = require('path');
const pool = require('../config/db');

// 💡 الوصول لملف firebase.js الموجود داخل مجلد src بشكل مطلق ودقيق 100%
const admin = require(path.join(process.cwd(), 'src', 'firebase.js'));

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '❌ غير مصرح لك بالدخول، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. التحقق من التوكن عبر فايربيز
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // 2. البحث عن صاحب النقطة محلياً بواسطة firebase_uid
    let ownerResult = await pool.query(
      'SELECT id, name, email, firebase_uid FROM owner WHERE firebase_uid = $1',
      [firebaseUid]
    );

    // 3. إنشاء تلقائي للحساب إذا لم يكن مخزناً محلياً
    if (ownerResult.rows.length === 0) {
      const name = decodedToken.name || decodedToken.email.split('@')[0];
      const email = decodedToken.email;

      const newOwner = await pool.query(
        'INSERT INTO owner (name, email, firebase_uid, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, firebase_uid',
        [name, email, firebaseUid]
      );
      ownerResult = { rows: [newOwner.rows[0]] };
    }

    // 4. تمرير بيانات صاحب المحطة للـ Controllers
    req.owner = ownerResult.rows[0]; 
    
    next();
  } catch (err) {
    console.error('Firebase Auth Error:', err.message);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '❌ انتهت صلاحية التوكن، يرجى تحديث الجلسة من الموبايل' });
    }
    return res.status(401).json({ message: '❌ توكن غير صالح أو منتهي الصلاحية', error: err.message });
  }
};

module.exports = authMiddleware;