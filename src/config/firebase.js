// src/config/firebase.js
const admin = require('firebase-admin');

let serviceAccount;

try {
  let privateKey;

  if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
    privateKey = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf-8');
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  if (!privateKey) {
    throw new Error('Firebase private key not provided in environment variables');
  }

  serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase admin initialized');
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error.message);
  throw error;
}

module.exports = admin;
