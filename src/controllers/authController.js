const pool = require('../config/db');
const admin = require('../firebase');

// تسجيل حساب جديد (باستخدام Firebase)
const register = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    // 1. التحقق إذا كان الإيميل موجود مسبقاً في قاعدة البيانات المحلية
    const existing = await pool.query(
      'SELECT * FROM owner WHERE email = $1', [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });
    }

    // 2. إنشاء المستخدم في Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      phoneNumber: phone || null,
    });

    // 3. تخزين معلومات إضافية في قاعدة البيانات المحلية (بدون كلمة المرور)
    const result = await pool.query(
      'INSERT INTO owner (firebase_uid, name, email, phone, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, firebase_uid, name, email',
      [userRecord.uid, name, email, phone || null]
    );

    // 4. إنشاء Custom Token من Firebase (اختياري - للاستخدام الداخلي)
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      message: '✅ تم إنشاء الحساب بنجاح',
      owner: result.rows[0],
      firebase_uid: userRecord.uid
    });

  } catch (err) {
    console.error('Registration error:', err);
    
    // معالجة أخطاء Firebase
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً في Firebase' });
    }
    
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

// تسجيل الدخول (التحقق من Firebase ID Token)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ملاحظة: Firebase لا يوفر طريقة مباشرة لتسجيل الدخول بالبريد وكلمة المرور من الخادم الخلفي
    // يجب أن يتم تسجيل الدخول من العميل (Mobile/Web) واستلام ID Token
    
    // الطريقة الصحيحة: استلام ID Token من العميل والتحقق منه
    // هذه الدالة ستعمل مع ID Token المرسل من العميل
    
    const idToken = req.body.idToken || req.headers.authorization?.split(' ')[1];
    
    if (!idToken) {
      return res.status(400).json({ 
        message: '❌ الرجاء إرسال Firebase ID Token' 
      });
    }
    
    // التحقق من صحة الـ ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const userEmail = decodedToken.email;
    
    // البحث عن المستخدم في قاعدة البيانات المحلية باستخدام firebase_uid
    let result = await pool.query(
      'SELECT id, firebase_uid, name, email, phone FROM owner WHERE firebase_uid = $1',
      [firebaseUid]
    );
    
    // إذا لم يكن المستخدم موجوداً في قاعدة البيانات المحلية، قم بإضافته
    if (result.rows.length === 0) {
      // جلب معلومات إضافية من Firebase
      const userRecord = await admin.auth().getUser(firebaseUid);
      
      result = await pool.query(
        'INSERT INTO owner (firebase_uid, name, email, phone, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, firebase_uid, name, email',
        [firebaseUid, userRecord.displayName || userEmail, userEmail, userRecord.phoneNumber || null]
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
    console.error('Login error:', err);
    
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ message: '❌ انتهت صلاحية التوكن' });
    }
    
    if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: '❌ توكن غير صالح' });
    }
    
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

// دالة مساعدة: التحقق من Firebase ID Token وإرجاع بيانات المستخدم
const verifyFirebaseToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: '❌ لا يوجد توكن' });
    }
    
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
    res.status(401).json({ 
      valid: false, 
      message: err.message 
    });
  }
};

// دالة لتسجيل الخروج (في Firebase، يتم التعامل معها من العميل)
const logout = async (req, res) => {
  // في Firebase Auth، لا يحتاج الخادم الخلفي للتعامل مع تسجيل الخروج
  // يتم التعامل معها من العميل بحذف التوكن المحلي
  res.json({ 
    message: '✅ تم تسجيل الخروج بنجاح (قم بحذف التوكن من جهاز العميل)' 
  });
};

module.exports = { 
  register, 
  login, 
  verifyFirebaseToken,
  logout
};