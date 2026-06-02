const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    await p.query("ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_shelf_number_key");
    await p.query("ALTER TABLE shelf ADD CONSTRAINT shelf_number_owner_unique UNIQUE (shelf_number, owner_id)");
    console.log("✅ تم إصلاح القيد!");
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
