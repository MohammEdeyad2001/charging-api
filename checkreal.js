const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:pPBLTmtUlfhfrlLqQHlVBuMAtfEHynAR@trolley.proxy.rlwy.net:51589/railway',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const tx = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='transaction'");
    console.log("اعمدة transaction:", tx.rows.map(r => r.column_name).join(', '));

    const owner = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='owner'");
    console.log("اعمدة owner:", owner.rows.map(r => r.column_name).join(', '));

    const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log("الجداول:", tables.rows.map(r => r.table_name).join(', '));
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    p.end();
  }
}
run();
