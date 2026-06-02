const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',
  ssl: { rejectUnauthorized: false }
});
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shelf'")
  .then(r => { console.log(r.rows); p.end(); })
  .catch(e => { console.error('ERROR:', e.message); p.end(); });
