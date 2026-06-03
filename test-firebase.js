// test-firebase.js
require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔄 جاري تهيئة Firebase...');

// تهيئة Firebase من متغيرات البيئة
const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};

// التحقق من وجود المتغيرات
console.log('📋 التحقق من متغيرات البيئة:');
console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ موجود' : '❌ مفقود');
console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ موجود' : '❌ مفقود');
console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ موجود' : '❌ مفقود');

if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('\n❌ خطأ: متغيرات Firebase غير موجودة في ملف .env');
  console.log('تأكد من إضافة متغيرات Firebase إلى ملف .env');
  process.exit(1);
}

// تهيئة Firebase
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ تم تهيئة Firebase بنجاح');
  } catch (error) {
    console.error('❌ خطأ في تهيئة Firebase:', error.message);
    process.exit(1);
  }
}

async function testFirebase() {
  console.log('\n🔄 جاري اختبار اتصال Firebase...');
  
  try {
    // محاولة إنشاء مستخدم تجريبي
    console.log('📝 محاولة إنشاء مستخدم تجريبي...');
    
    const user = await admin.auth().createUser({
      email: 'test@example.com',
      password: '123456789',
      displayName: 'Test User'
    });
    
    console.log('✅ تم إنشاء المستخدم بنجاح!');
    console.log('📧 البريد:', user.email);
    console.log('🆔 UID:', user.uid);
    console.log('📛 الاسم:', user.displayName);
    
    // جلب معلومات المستخدم
    const userInfo = await admin.auth().getUser(user.uid);
    console.log('✅ تم جلب معلومات المستخدم بنجاح');
    
    // حذف المستخدم التجريبي
    await admin.auth().deleteUser(user.uid);
    console.log('🗑️ تم حذف المستخدم التجريبي');
    
    console.log('\n🎉🎉🎉 Firebase يعمل بشكل مثالي! 🎉🎉🎉');
    console.log('✅ أنت جاهز للبدء في استخدام Firebase Auth');
    
  } catch (error) {
    console.error('\n❌ خطأ في Firebase:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('📝 المستخدم موجود مسبقاً، نحاول حذفه أولاً...');
      try {
        // محاولة البحث عن المستخدم وحذفه
        const user = await admin.auth().getUserByEmail('test@example.com');
        await admin.auth().deleteUser(user.uid);
        console.log('🗑️ تم حذف المستخدم الموجود، حاول مرة أخرى');
      } catch (e) {
        console.log('لم نتمكن من حذف المستخدم');
      }
    }
    
    console.log('\n🔧 الأسباب المحتملة للخطأ:');
    console.log('1. ❌ خدمة Email/Password غير مفعلة في Firebase Console');
    console.log('   الحل: اذهب إلى Authentication → Sign-in methods → فعّل Email/Password');
    console.log('2. ❌ متغيرات Firebase في ملف .env غير صحيحة');
    console.log('3. ❌ ملف JSON الذي حملته من Firebase غير متطابق');
    console.log('4. ❌ المشروع ليس على خطة Blaze (للوصول إلى Authentication APIs)');
  }
}

// تشغيل الاختبار
testFirebase();