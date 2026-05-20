const pool = require('../config/db');

const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM product WHERE owner_id = $1 ORDER BY type, name',
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const addProduct = async (req, res) => {
  const { name, type, cost_price, selling_price } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO product (name, type, cost_price, selling_price, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, type, cost_price || 0, selling_price, req.owner.id]
    );
    res.status(201).json({ message: '✅ تم إضافة المنتج بنجاح', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

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
       WHERE id = $5 AND owner_id = $6 RETURNING *`,
      [name, type, cost_price, selling_price, id, req.owner.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: '✅ تم تعديل المنتج بنجاح', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const inUse = await pool.query(
      'SELECT COUNT(*) FROM transaction WHERE product_id = $1', [id]
    );
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ message: '❌ لا يمكن حذف منتج مستخدم في عمليات' });
    }
    const result = await pool.query(
      'DELETE FROM product WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, req.owner.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: '✅ تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getAllProducts, addProduct, updateProduct, deleteProduct };