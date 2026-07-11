const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const c = await p.query("SELECT id, name, balance, owner_id FROM customer ORDER BY id");
    console.table(c.rows);
  } catch(e){ console.error(e.message); } finally { p.end(); }
}
run();
