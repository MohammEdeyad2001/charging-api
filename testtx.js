const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const r = await p.query(
      `INSERT INTO transaction (customer_id, product_id, shelf_id, quantity, amount_due, amount_paid, payment_status, notes, type, status, delivered_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11) RETURNING *`,
      [1, 36, 40, 1, 2, 0, "debt", null, "charging", "pending", 11]
    );
    console.log("OK:", r.rows[0]);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
