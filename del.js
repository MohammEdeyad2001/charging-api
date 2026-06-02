const {Pool} = require('pg');
const p = new Pool({connectionString:'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',ssl:{rejectUnauthorized:false}});
p.query("DELETE FROM transaction WHERE id=4").then(()=>{console.log("deleted");p.end();}).catch(e=>{console.error(e.message);p.end();});
