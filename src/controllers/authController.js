// src/controllers/authController.js
const pool = require('../config/db');
const admin = require('../config/firebase'); // تم تصحيح المسار

// تسجيل حساب جديد (باستخدام Firebase)
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: '❌ الحقول name, email, password مطلوبة' });
  }

  try {
    // تحقق محلي أولاً
    const existing = await pool.query('SELECT id FROM owner WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // إنشاء المستخدم في Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone || null,
    });

    // تخزين معلومات إضافية في قاعدة البيانات المحلية
    const result = await pool.query(
      `INSERT INTO owner (firebase_uid, name, email, phone, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, firebase_uid, name, email`,
      [userRecord.uid, name.slice(0,255), email.slice(0,255), phone || null]
    );

    res.status(201).json({
      message: '✅ تم إنشاء الحساب بنجاح',
      owner: result.rows[0],
      firebase_uid: userRecord.uid
    });

  } catch (err) {
    console.error('Registration error:', err && err.message ? err.message : err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً في Firebase' });
    }
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

// تسجيل الدخول بالتحقق من ID Token المرسل من العميل
const login = async (req, res) => {
  try {
    const idToken = req.body.idToken || req.headers.authorization?.split(' ')[1];
    if (!idToken) {
      return res.status(400).json({ message: '❌ الرجاء إرسال Firebase ID Token' });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const userEmail = decodedToken.email;

    let result = await pool.query(
      'SELECT id, firebase_uid, name, email, phone FROM owner WHERE firebase_uid = $1 LIMIT 1',
      [firebaseUid]
    );

    if (result.rows.length === 0) {
      const userRecord = await admin.auth().getUser(firebaseUid);
      result = await pool.query(
        `INSERT INTO owner (firebase_uid, name, email, phone, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, firebase_uid, name, email`,
        [firebaseUid, (userRecord.displayName || userEmail).slice(0,255), userEmail.slice(0,255), userRecord.phoneNumber || null]
      );
    }

    const owner = result.rows[0];

    res.json({
      message: '✅ تم تسجيل الدخول بنجاح',
      firebase_id_token: idToken,
      owner: {
        id: owner.id,
        firebase_uid: owner.firebase_uid,
        name: owner.name,
        email: owner.email
      }
    });
  } catch (err) {
    console.error('Login error:', err && err.message ? err.message : err);
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '❌ انتهت صلاحية التوكن' });
    }
    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: '❌ توكن غير صالح' });
    }
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const verifyFirebaseToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '❌ لا يوجد توكن' });

    const decodedToken = await admin.auth().verifyIdToken(token);
    res.json({
      valid: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        email_verified: decodedToken.email_verified
      }
    });
  } catch (err) {
    console.error('verifyFirebaseToken error:', err && err.message ? err.message : err);
    res.status(401).json({ valid: false, message: 'توكن غير صالح' });
  }
};

const logout = async (req, res) => {
  res.json({ message: '✅ تم تسجيل الخروج بنجاح (قم بحذف التوكن من جهاز العميل)' });
};

module.exports = { register, login, verifyFirebaseToken, logout };
