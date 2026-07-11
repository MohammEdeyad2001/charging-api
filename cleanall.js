const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    await p.query("DELETE FROM debt_payment");
    await p.query("DELETE FROM transaction");
    await p.query("DELETE FROM shelf");
    await p.query("DELETE FROM product");
    await p.query("DELETE FROM customer");
    await p.query("DELETE FROM owner");
    console.log("✅ تم مسح كل بيانات الاختبار. القاعدة نظيفة الآن.");
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
