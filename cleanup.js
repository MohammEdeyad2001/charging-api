const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
p.query("DELETE FROM shelf WHERE shelf_number='3' AND owner_id=1")
  .then(() => { console.log("✅ تم حذف الرف الاختباري"); p.end(); })
  .catch(e => { console.error("ERROR:", e.message); p.end(); });
