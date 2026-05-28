const { Pool } = require('pg');

const pool = new Pool({
connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS owner (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customer (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        balance FLOAT DEFAULT 0,
        owner_id INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50),
        cost_price FLOAT DEFAULT 0,
        selling_price FLOAT NOT NULL,
        profit FLOAT GENERATED ALWAYS AS (selling_price - cost_price) STORED,
        owner_id INT
      );

      CREATE TABLE IF NOT EXISTS shelf (
        id SERIAL PRIMARY KEY,
        shelf_number VARCHAR(20) UNIQUE NOT NULL,
        is_occupied BOOLEAN DEFAULT FALSE,
        current_customer_id INT,
        owner_id INT
      );

      CREATE TABLE IF NOT EXISTS transaction (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        product_id INT,
        shelf_id INT,
        quantity INT DEFAULT 1,
        amount_due FLOAT NOT NULL,
        amount_paid FLOAT DEFAULT 0,
        remaining_debt FLOAT GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
        payment_status VARCHAR(20) DEFAULT 'pending',
        status VARCHAR(20) DEFAULT 'pending',
        received_at TIMESTAMP DEFAULT NOW(),
        delivered_at TIMESTAMP,
        notes TEXT,
        date DATE DEFAULT CURRENT_DATE,
        owner_id INT
      );

      CREATE TABLE IF NOT EXISTS debt_payment (
        id SERIAL PRIMARY KEY,
        customer_id INT,
        amount FLOAT NOT NULL,
        note TEXT,
        paid_at TIMESTAMP DEFAULT NOW()
      );

// ... الكود القديم الموجود في setup-db.js
CREATE TABLE IF NOT EXISTS debt_payment (
    id SERIAL PRIMARY KEY,
    customer_id INT,
    amount FLOAT NOT NULL,
    note TEXT,
    paid_at TIMESTAMP DEFAULT NOW()
);

-- التعديل الجديد: أضف السطرين هنا داخل نفس النص
ALTER TABLE owner ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE;
ALTER TABLE owner ALTER COLUMN password DROP NOT NULL;

    `);


    
    console.log('✅ تم إنشاء الجداول بنجاح!');
  } catch (err) {
    console.error('❌ خطأ:', err.message);
  } finally {
    pool.end();
  }


  
};

createTables();