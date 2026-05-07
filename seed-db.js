const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:pPBLTmtUlfhfrlLqQHlVBuMAtfEHynAR@trolley.proxy.rlwy.net:51589/railway',
  ssl: { rejectUnauthorized: false }
});

const seedData = async () => {
  try {
    // إضافة المنتجات
    await pool.query(`
      INSERT INTO product (name, type, cost_price, selling_price) VALUES
      ('جوال', 'charging', 0, 1),
      ('ساعة', 'charging', 0, 1),
      ('سماعة ايربودز', 'charging', 0, 1),
      ('شراب', 'product', 0, 1),
      ('شراب/عصير', 'product', 0, 1),
      ('شيشة', 'charging', 0, 1),
      ('ضوء كشاف', 'charging', 0, 1),
      ('عصير', 'product', 0, 1),
      ('مي', 'product', 0, 1),
      ('باوربانك', 'charging', 0, 2),
      ('جوال بدون', 'charging', 0, 2),
      ('كشاف كبير', 'charging', 0, 2),
      ('كولا 2', 'product', 0, 2),
      ('كولا 3', 'product', 0, 3),
      ('لابتوب', 'charging', 0, 3),
      ('كولا 4', 'product', 0, 4),
      ('كولا 17', 'product', 0, 17),
      ('كرت نت', 'product', 0, 2),
      ('ثلج', 'product', 0, 2),
      ('رصيد', 'product', 0, 1),
      ('كولا 10', 'product', 0, 10),
      ('ماكينة حلاقة', 'charging', 0, 2),
      ('سداد', 'product', 0, 0)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ تم إضافة المنتجات!');

    // إضافة الرفوف
    await pool.query(`
      INSERT INTO shelf (shelf_number) VALUES
      ('1'), ('2'), ('3'), ('4'), ('5'),
      ('6'), ('7'), ('8'), ('9'), ('10')
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ تم إضافة الرفوف!');

    console.log('🎉 تم إعداد قاعدة البيانات بنجاح!');
  } catch (err) {
    console.error('❌ خطأ:', err.message);
  } finally {
    pool.end();
  }
};

seedData();