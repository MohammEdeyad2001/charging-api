const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// تسجيل حساب جديد
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    }

    const user = await admin.auth().createUser({
      email,
      password
    });

    res.json({
      success: true,
      uid: user.uid,
      email: user.email,
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

    // البحث عن المستخدم من Firebase
    const user = await admin.auth().getUserByEmail(email);

    // إنشاء Custom Token
    const token = await admin.auth().createCustomToken(user.uid);

    res.json({
      success: true,
      token: token,
      uid: user.uid,
      email: user.email,
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;