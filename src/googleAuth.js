// src/routes/googleAuth.js
const { GoogleAuth } = require('google-auth-library');

const SCOPES = [
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/cloud-platform'
];

// قراءة JSON من متغير بيئة Base64 (آمن للنشر على Railway/Heroku)
function getServiceAccountFromEnv() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_BASE64 environment variable');
  }
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (err) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_BASE64 content');
  }
}

let cachedClient = null;
let cachedAccessToken = null;
let tokenExpiry = 0;

async function getAuthenticatedClient() {
  if (cachedClient) return cachedClient;

  const key = getServiceAccountFromEnv();

  const auth = new GoogleAuth({
    credentials: key,
    scopes: SCOPES
  });

  cachedClient = await auth.getClient();
  return cachedClient;
}

async function getAccessToken(forceRefresh = false) {
  // إعادة استخدام التوكن إذا لم ينتهِ
  const now = Date.now();
  if (!forceRefresh && cachedAccessToken && tokenExpiry - 60000 > now) {
    return cachedAccessToken;
  }

  const client = await getAuthenticatedClient();
  const res = await client.getAccessToken();
  const token = res && (res.token || res);
  if (!token) throw new Error('Failed to obtain access token');

  // حاول استخراج وقت الانتهاء من الـ JWT إذا أمكن، وإلا اضبط صلاحية افتراضية 1 ساعة
  tokenExpiry = now + (60 * 60 * 1000); // افتراضي ساعة
  cachedAccessToken = token;
  return token;
}

async function callGoogleAPI(url, method = 'GET', data = null, opts = {}) {
  try {
    const client = await getAuthenticatedClient();
    const options = {
      url,
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: opts.timeout || 15000
    };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.data = data;
    }
    const response = await client.request(options);
    return response.data;
  } catch (error) {
    // لوج آمن: اطبع الرسالة والتفاصيل المفيدة فقط
    console.error('Google API call failed:', error.message || error);
    if (error.response && error.response.data) {
      console.error('Google API response error:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

module.exports = {
  getAccessToken,
  getAuthenticatedClient,
  callGoogleAPI
};
