const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const owners = await p.query("SELECT id, name, email FROM owner");
    console.log("المستخدمون:", owners.rows);

    const customers = await p.query("SELECT id, name, owner_id FROM customer");
    console.log("الزبائن:", customers.rows);

    const products = await p.query("SELECT id, name, owner_id FROM product");
    console.log("المنتجات:", products.rows);

    const shelves = await p.query("SELECT id, shelf_number, owner_id FROM shelf");
    console.log("الرفوف:", shelves.rows);

    const tx = await p.query("SELECT id, customer_id, owner_id, type FROM transaction");
    console.log("العمليات:", tx.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
