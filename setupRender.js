const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    await p.query(`CREATE TABLE IF NOT EXISTS owner (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255), phone VARCHAR(20), firebase_uid VARCHAR(255) UNIQUE, created_at TIMESTAMP DEFAULT NOW())`);
    await p.query(`CREATE TABLE IF NOT EXISTS customer (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, phone VARCHAR(20),
      balance FLOAT DEFAULT 0, owner_id INT REFERENCES owner(id), created_at TIMESTAMP DEFAULT NOW())`);
    await p.query(`CREATE TABLE IF NOT EXISTS product (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, type VARCHAR(50),
      cost_price FLOAT DEFAULT 0, selling_price FLOAT NOT NULL,
      profit FLOAT GENERATED ALWAYS AS (selling_price - cost_price) STORED, owner_id INT REFERENCES owner(id))`);
    await p.query(`CREATE TABLE IF NOT EXISTS shelf (
      id SERIAL PRIMARY KEY, shelf_number VARCHAR(20) NOT NULL, is_occupied BOOLEAN DEFAULT FALSE,
      current_customer_id INT REFERENCES customer(id), owner_id INT REFERENCES owner(id),
      CONSTRAINT shelf_number_owner_unique UNIQUE (shelf_number, owner_id))`);
    await p.query(`CREATE TABLE IF NOT EXISTS transaction (
      id SERIAL PRIMARY KEY, customer_id INT REFERENCES customer(id), product_id INT REFERENCES product(id),
      shelf_id INT REFERENCES shelf(id), quantity INT DEFAULT 1, amount_due FLOAT NOT NULL,
      amount_paid FLOAT DEFAULT 0, remaining_debt FLOAT GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
      payment_status VARCHAR(20) DEFAULT 'pending', status VARCHAR(20) DEFAULT 'pending',
      type VARCHAR(20) DEFAULT 'charging', received_at TIMESTAMP DEFAULT NOW(), delivered_at TIMESTAMP,
      notes TEXT, date DATE DEFAULT CURRENT_DATE, owner_id INT REFERENCES owner(id))`);
    await p.query(`CREATE TABLE IF NOT EXISTS debt_payment (
      id SERIAL PRIMARY KEY, customer_id INT REFERENCES customer(id), amount FLOAT NOT NULL,
      note TEXT, paid_at TIMESTAMP DEFAULT NOW())`);
    const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("OK tables:", tables.rows.map(r => r.table_name).join(', '));
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
