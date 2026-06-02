const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const r = await p.query(
      "INSERT INTO shelf (shelf_number, owner_id) VALUES ($1, $2) RETURNING *",
      ["3", 1]
    );
    console.log("OK:", r.rows[0]);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
