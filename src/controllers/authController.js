const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// تسجيل حساب جديد
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // تحقق إذا الإيميل موجود مسبقاً
    const existing = await pool.query(
      'SELECT * FROM owner WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password, 10);

    // إضافة المستخدم
    const result = await pool.query(
      'INSERT INTO owner (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id, name, email',
      [name, email, hashedPassword, phone]
    );

    res.status(201).json({
      message: '✅ تم إنشاء الحساب بنجاح',
      owner: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

// تسجيل الدخول
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // البحث عن المستخدم
    const result = await pool.query(
      'SELECT * FROM owner WHERE email = $1', [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const owner = result.rows[0];

    // التحقق من كلمة المرور
    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    // إنشاء JWT Token
    const token = jwt.sign(
      { id: owner.id, email: owner.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '✅ تم تسجيل الدخول بنجاح',
      token,
      owner: { id: owner.id, name: owner.name, email: owner.email }
    });

  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { register, login };