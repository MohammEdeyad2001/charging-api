const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    // عرض كل القيود على جدول shelf
    const constraints = await p.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'shelf'::regclass AND contype = 'u'
    `);
    console.log("القيود الموجودة:", constraints.rows);

    // حذف القيد القديم
    await p.query("ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_shelf_number_key");
    console.log("✅ تم حذف القيد القديم");

    // التأكد من وجود القيد المركب الصحيح
    await p.query("ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_number_owner_unique");
    await p.query("ALTER TABLE shelf ADD CONSTRAINT shelf_number_owner_unique UNIQUE (shelf_number, owner_id)");
    console.log("✅ تم إضافة القيد المركب الصحيح");
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
