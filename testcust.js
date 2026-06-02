const {Pool} = require('pg');
const p = new Pool({connectionString:'postgresql://postgres:nNTldTMyEVzaEwOcsoxLmFaXQodAJbLI@trolley.proxy.rlwy.net:49829/railway',ssl:{rejectUnauthorized:false}});
async function run(){
  try{
    const r = await p.query("INSERT INTO customer (name, owner_id) VALUES ($1,$2) RETURNING *",["اختبار",11]);
    console.log("OK:",r.rows[0]);
  }catch(e){console.error("ERROR:",e.message);}
  finally{p.end();}
}
run();
