const admin = require('../config/firebase');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '❌ يجب تسجيل الدخول أولاً' });
  }

  try {
    // التحقق من Firebase Token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // البحث عن صاحب النقطة في قاعدة البيانات
    let owner = await pool.query(
      'SELECT * FROM owner WHERE firebase_uid = $1',
      [decodedToken.uid]
    );

    // إذا لم يوجد — أنشئه تلقائياً
    if (owner.rows.length === 0) {
      const newOwner = await pool.query(
        'INSERT INTO owner (name, email, firebase_uid) VALUES ($1, $2, $3) RETURNING *',
        [decodedToken.name || decodedToken.email, decodedToken.email, decodedToken.uid]
      );
      owner = { rows: newOwner.rows };
    }

    req.owner = owner.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: '❌ Token غير صالح', error: err.message });
  }
};

module.exports = authMiddleware;