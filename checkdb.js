const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:pPBLTmtUlfhfrlLqQHlVBuMAtfEHynAR@trolley.proxy.rlwy.net:51589/railway',
  ssl: { rejectUnauthorized: false }
});
p.query("SELECT COUNT(*) FROM owner")
  .then(r => { console.log("✅ القاعدة تعمل! عدد المستخدمين:", r.rows[0].count); p.end(); })
  .catch(e => { console.error("❌ القاعدة متوقفة:", e.message); p.end(); });
