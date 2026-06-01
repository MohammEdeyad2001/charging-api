const path = require('path');
const pool = require('../config/db');

const admin = require(path.join(__dirname, '../firebase'));

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '❌ غير مصرح لك بالدخول، التوكن مفقود' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    // البحث عن owner بـ firebase_uid أو email
    let ownerResult = await pool.query(
      'SELECT id, name, email, firebase_uid FROM owner WHERE firebase_uid = $1 OR email = $2',
      [firebaseUid, email]
    );

    if (ownerResult.rows.length === 0) {
      // إنشاء owner جديد
      const name = decodedToken.name || email.split('@')[0];

      const newOwner = await pool.query(
        'INSERT INTO owner (name, email, firebase_uid, password, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, email, firebase_uid',
        [name, email, firebaseUid, 'firebase_auth']
      );
      ownerResult = { rows: [newOwner.rows[0]] };
    } else {
      // تحديث firebase_uid إذا لم يكن موجوداً
      if (!ownerResult.rows[0].firebase_uid) {
        await pool.query(
          'UPDATE owner SET firebase_uid = $1 WHERE id = $2',
          [firebaseUid, ownerResult.rows[0].id]
        );
        ownerResult.rows[0].firebase_uid = firebaseUid;
      }
    }

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