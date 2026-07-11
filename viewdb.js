const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const owners = await p.query("SELECT * FROM owner");
    console.log("=== المستخدمون (owner) ===");
    console.table(owners.rows);

    const customers = await p.query("SELECT * FROM customer");
    console.log("=== الزبائن (customer) ===");
    console.table(customers.rows);

    const products = await p.query("SELECT * FROM product");
    console.log("=== المنتجات (product) ===");
    console.table(products.rows);

    const shelves = await p.query("SELECT * FROM shelf");
    console.log("=== الرفوف (shelf) ===");
    console.table(shelves.rows);

    const tx = await p.query("SELECT * FROM transaction");
    console.log("=== العمليات (transaction) ===");
    console.table(tx.rows);

    const debts = await p.query("SELECT * FROM debt_payment");
    console.log("=== السدادات (debt_payment) ===");
    console.table(debts.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
