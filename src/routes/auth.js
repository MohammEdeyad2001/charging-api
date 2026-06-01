// src/routes/auth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const admin = require('../config/firebase'); // استخدم تهيئة firebase-admin الموجودة
const pool = require('../config/db');

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || null;

// Signup: إنشاء مستخدم في Firebase ثم إضافة سجل owner محلياً
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!email || typeof email !== 'string' || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'البريد الإلكتروني غير صحيح' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'الاسم مطلوب' });
    }

    // إنشاء المستخدم في Firebase
    const userRecord = await admin.auth().createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
      phoneNumber: phone || null
    });

    // إضافة سجل owner محلياً (تجنّب تكرار السجلات)
    const upsertQuery = `
      INSERT INTO owner (firebase_uid, name, email, phone, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (email) DO UPDATE
        SET firebase_uid = COALESCE(owner.firebase_uid, EXCLUDED.firebase_uid)
      RETURNING id, firebase_uid, name, email
    `;
    const ownerRes = await pool.query(upsertQuery, [
      userRecord.uid,
      name.slice(0, 255),
      email.trim().toLowerCase().slice(0, 255),
      phone || null
    ]);

    return res.status(201).json({
      success: true,
      owner: ownerRes.rows[0],
      message: '✅ تم إنشاء الحساب بنجاح'
    });
  } catch (err) {
    console.error('Signup error:', err && err.message ? err.message : err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً في Firebase' });
    }
    return res.status(500).json({ error: 'فشل إنشاء الحساب' });
  }
});

// Login via Firebase REST (اختياري) — يُفضّل تسجيل الدخول على العميل ثم إرسال idToken إلى الخادم
router.post('/login', async (req, res) => {
  if (!FIREBASE_WEB_API_KEY) {
    return res.status(500).json({ error: 'FIREBASE_WEB_API_KEY غير مضبوط على الخادم' });
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });

    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email: email.trim(),
        password,
        returnSecureToken: true
      },
      { timeout: 10000 }
    );

    const idToken = response.data.idToken;
    const uid = response.data.localId;

    // (اختياري) تأكد من وجود owner محلي أو أنشئه
    const ownerQuery = 'SELECT id, firebase_uid, name, email FROM owner WHERE firebase_uid = $1 LIMIT 1';
    let ownerRes = await pool.query(ownerQuery, [uid]);
    if (ownerRes.rows.length === 0) {
      const userRecord = await admin.auth().getUser(uid);
      const insert = await pool.query(
        `INSERT INTO owner (firebase_uid, name, email, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING id, firebase_uid, name, email`,
        [uid, (userRecord.displayName || email).slice(0,255), (userRecord.email || email).toLowerCase().slice(0,255)]
      );
      ownerRes = insert;
    }

    return res.json({
      success: true,
      token: idToken,
      uid,
      owner: ownerRes.rows[0],
      message: '✅ تم تسجيل الدخول بنجاح'
    });
  } catch (err) {
    console.error('Login error:', err.response?.data || err.message || err);
    const msg = err.response?.data?.error?.message || 'فشل تسجيل الدخول';
    return res.status(401).json({ error: msg });
  }
});

// Verify token: استقبل idToken من العميل وتحقق منه ثم أعد بيانات المالك
router.post('/verify', async (req, res) => {
  try {
    const idToken = req.body.idToken || req.headers.authorization?.split(' ')[1];
    if (!idToken) return res.status(400).json({ error: 'idToken مطلوب' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();

    // جلب أو إنشاء owner محلي كما في الميدلوير
    const ownerQuery = 'SELECT id, firebase_uid, name, email FROM owner WHERE firebase_uid = $1 OR email = $2 LIMIT 1';
    let ownerRes = await pool.query(ownerQuery, [uid, email]);
    if (ownerRes.rows.length === 0) {
      const name = (decoded.name || email.split('@')[0]).slice(0,255);
      const upsert = await pool.query(
        `INSERT INTO owner (firebase_uid, name, email, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (email) DO UPDATE
           SET firebase_uid = COALESCE(owner.firebase_uid, EXCLUDED.firebase_uid)
         RETURNING id, firebase_uid, name, email`,
        [uid, name, email]
      );
      ownerRes = upsert;
    }

    return res.json({ valid: true, owner: ownerRes.rows[0], decoded });
  } catch (err) {
    console.error('Verify token error:', err && err.message ? err.message : err);
    return res.status(401).json({ valid: false, error: 'توكن غير صالح' });
  }
});

module.exports = router;
