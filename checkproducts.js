const {Pool} = require('pg');
const p = new Pool({
  connectionString: 'postgresql://charging_user:P800wFLUC5lA6CmNddoJoEbO3rdCrO7R@dpg-d8in81sm0tmc73bpmc00-a.oregon-postgres.render.com/charging',
  ssl: { rejectUnauthorized: false }
});
p.query("SELECT id, name, type, selling_price FROM product ORDER BY type, name")
  .then(r => { console.table(r.rows); p.end(); })
  .catch(e => { console.error(e.message); p.end(); });
