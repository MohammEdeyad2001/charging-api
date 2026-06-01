const { GoogleAuth } = require('google-auth-library');
const path = require('path');

// مسار ملف JSON حق Service Account (موجود في جذر المشروع)
const KEY_FILE_PATH = path.join(__dirname, '../../charging-point-d964c.js');

// سجل الخدمات اللي تحتاجها (غيرها حسب API اللي تستخدمه)
const SCOPES = [
    'https://www.googleapis.com/auth/firebase.messaging',
    'https://www.googleapis.com/auth/cloud-platform'
];

let authClient = null;

/**
 * الحصول على Access Token صالح للاستخدام
 */
async function getAccessToken() {
    try {
        const auth = new GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: SCOPES
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        return token.token;
    } catch (error) {
        console.error('❌ فشل في الحصول على Access Token:', error.message);
        throw error;
    }
}

/**
 * الحصول على Client جاهز للمصادقة (للاستخدام مع axios أو fetch)
 */
async function getAuthenticatedClient() {
    if (!authClient) {
        const auth = new GoogleAuth({
            keyFile: KEY_FILE_PATH,
            scopes: SCOPES
        });
        authClient = await auth.getClient();
    }
    return authClient;
}

/**
 * استدعاء أي Google API مع مصادقة تلقائية
 * @param {string} url - رابط API
 * @param {string} method - GET, POST, PUT, DELETE
 * @param {object} data - البيانات (اختياري)
 */
async function callGoogleAPI(url, method = 'GET', data = null) {
    try {
        const client = await getAuthenticatedClient();
        
        const options = {
            url: url,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.data = data;
        }
        
        const response = await client.request(options);
        return response.data;
        
    } catch (error) {
        console.error('❌ فشل استدعاء Google API:', error.message);
        if (error.response) {
            console.error('تفاصيل:', error.response.data);
        }
        throw error;
    }
}

module.exports = {
    getAccessToken,
    getAuthenticatedClient,
    callGoogleAPI
};