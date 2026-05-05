const pool = require('../config/db');

// جلب كل المنتجات
const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product ORDER BY type, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

// إضافة منتج جديد
const addProduct = async (req, res) => {
  const { name, type, cost_price, selling_price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product (name, type, cost_price, selling_price) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, type, cost_price || 0, selling_price]
    );
    res.status(201).json({
      message: '✅ تم إضافة المنتج بنجاح',
      product: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

// تعديل منتج
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, type, cost_price, selling_price } = req.body;
  try {
    const result = await pool.query(
      `UPDATE product SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        cost_price = COALESCE($3, cost_price),
        selling_price = COALESCE($4, selling_price)
       WHERE id = $5 RETURNING *`,
      [name, type, cost_price, selling_price, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: '✅ تم تعديل المنتج بنجاح', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getAllProducts, addProduct, updateProduct };