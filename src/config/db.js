// src/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

function createPoolFromUrl(url) {
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });
}

function createPoolFromParts() {
  return new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
}

const pool = process.env.DATABASE_URL
  ? createPoolFromUrl(process.env.DATABASE_URL)
  : createPoolFromParts();

pool.connect()
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('❌ فشل الاتصال بقاعدة البيانات:', err.message));

module.exports = pool;
