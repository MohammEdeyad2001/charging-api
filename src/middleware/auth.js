// src/middleware/auth.js
const pool = require('../config/db');
const admin = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '❌ غير مصرح لك بالدخول، التوكن مفقود' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return res.status(401).json({ message: '❌ صيغة التوكن غير صحيحة' });
  }

  const token = parts[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;
    const email = (decodedToken.email || '').toLowerCase();

    if (!firebaseUid || !email) {
      return res.status(401).json({ message: '❌ التوكن لا يحتوي على بيانات مطلوبة' });
    }

    // حاول الحصول على owner أولاً
    let ownerResult = await pool.query(
      'SELECT id, name, email, firebase_uid FROM owner WHERE firebase_uid = $1 OR email = $2 LIMIT 1',
      [firebaseUid, email]
    );

    if (ownerResult.rows.length === 0) {
      // استخدم UPSERT آمن: يفترض وجود قيد UNIQUE(email)
      const name = (decodedToken.name || email.split('@')[0]).slice(0, 255);
      const emailSafe = email.slice(0, 255);
      try {
        const upsertQuery = `
          INSERT INTO owner (name, email, firebase_uid, password, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (email) DO UPDATE
            SET firebase_uid = COALESCE(owner.firebase_uid, EXCLUDED.firebase_uid)
          RETURNING id, name, email, firebase_uid
        `;
        const upsertRes = await pool.query(upsertQuery, [name, emailSafe, firebaseUid, 'firebase_auth']);
        ownerResult = { rows: [upsertRes.rows[0]] };
      } catch (upsertErr) {
        // في حال فشل الـ UPSERT لسبب غير متوقع، حاول قراءة السجل مرة أخرى
        console.error('Owner upsert error:', upsertErr && upsertErr.message ? upsertErr.message : upsertErr);
        ownerResult = await pool.query(
          'SELECT id, name, email, firebase_uid FROM owner WHERE firebase_uid = $1 OR email = $2 LIMIT 1',
          [firebaseUid, email]
        );
      }
    } else {
      // تحديث firebase_uid إذا لم يكن موجوداً
      if (!ownerResult.rows[0].firebase_uid) {
        try {
          await pool.query(
            'UPDATE owner SET firebase_uid = $1 WHERE id = $2',
            [firebaseUid, ownerResult.rows[0].id]
          );
          ownerResult.rows[0].firebase_uid = firebaseUid;
        } catch (updateErr) {
          console.error('Failed to update owner firebase_uid:', updateErr && updateErr.message ? updateErr.message : updateErr);
        }
      }
    }

    req.owner = ownerResult.rows[0];
    next();
  } catch (err) {
    console.error('Firebase Auth Error:', err && err.message ? err.message : err);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '❌ انتهت صلاحية التوكن، يرجى تحديث الجلسة من الموبايل' });
    }
    return res.status(401).json({ message: '❌ توكن غير صالح أو منتهي الصلاحية' });
  }
};

module.exports = authMiddleware;
