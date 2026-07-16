const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    console.log("========== العمليات (الأحدث أولاً) ==========");
    const tx = await p.query(`
      SELECT t.id, c.name AS customer, p2.name AS product, t.quantity AS qty,
             t.amount_due AS due, t.amount_paid AS paid, t.remaining_debt AS remaining,
             t.type, t.status, TO_CHAR(t.received_at, 'MM-DD HH24:MI') AS at
      FROM transaction t
      LEFT JOIN customer c ON t.customer_id = c.id
      LEFT JOIN product p2 ON t.product_id = p2.id
      WHERE t.owner_id = 6
      ORDER BY t.received_at DESC LIMIT 20`);
    console.table(tx.rows);

    console.log("========== الإيداعات/السدادات ==========");
    const pay = await p.query(`
      SELECT dp.id, c.name AS customer, dp.amount, dp.note,
             TO_CHAR(dp.paid_at, 'MM-DD HH24:MI') AS at
      FROM debt_payment dp
      JOIN customer c ON dp.customer_id = c.id
      WHERE c.owner_id = 6
      ORDER BY dp.paid_at DESC LIMIT 20`);
    console.table(pay.rows);

    console.log("========== الأرصدة الحالية ==========");
    const bal = await p.query(
      "SELECT id, name, balance FROM customer WHERE owner_id = 6 ORDER BY id");
    console.table(bal.rows);
  } catch (e) { console.error("ERROR:", e.message); } finally { p.end(); }
}
run();
