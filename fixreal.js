const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:pPBLTmtUlfhfrlLqQHlVBuMAtfEHynAR@trolley.proxy.rlwy.net:51589/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    // 1. عرض القيود الحالية على جدول shelf
    const before = await p.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'shelf'::regclass AND contype = 'u'
    `);
    console.log("القيود قبل الإصلاح:", before.rows.map(r => r.conname));

    // 2. حذف القيد العام القديم (إن وجد)
    await p.query("ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_shelf_number_key");

    // 3. التأكد من القيد المركب الصحيح
    await p.query("ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_number_owner_unique");
    await p.query("ALTER TABLE shelf ADD CONSTRAINT shelf_number_owner_unique UNIQUE (shelf_number, owner_id)");

    // 4. عرض القيود بعد الإصلاح
    const after = await p.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'shelf'::regclass AND contype = 'u'
    `);
    console.log("✅ القيود بعد الإصلاح:", after.rows.map(r => r.conname));
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
