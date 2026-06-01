const express = require('express');
const admin = require('firebase-admin');
const axios = require('axios');
const router = express.Router();

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyC1P5igV1WLjN6GopAu9cEY3oXcHm4QrwI';

// تسجيل حساب جديد
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    await admin.auth().createUser({
      email,
      password
    });

    res.json({
      success: true,
      email: email,
      message: 'تم إنشاء الحساب بنجاح'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    // استخدام Firebase REST API للتحقق من البيانات والحصول على ID Token
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        email: email,
        password: password,
        returnSecureToken: true
      }
    );

    const idToken = response.data.idToken;
    const uid = response.data.localId;

    res.json({
      success: true,
      token: idToken,
      uid: uid,
      email: email,
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    res.status(401).json({
      error: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;