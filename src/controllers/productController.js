// src/controllers/productController.js
const pool = require('../config/db');

const getAllProducts = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await pool.query(
      'SELECT * FROM product WHERE owner_id = $1 ORDER BY type, name',
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAllProducts error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const addProduct = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });

  const { name, type, cost_price, selling_price } = req.body;
  if (!name || typeof selling_price === 'undefined') {
    return res.status(400).json({ message: 'الحقول name و selling_price مطلوبة' });
  }

  const cost = Number(cost_price || 0);
  const sell = Number(selling_price);
  if (Number.isNaN(cost) || Number.isNaN(sell)) {
    return res.status(400).json({ message: 'الأسعار يجب أن تكون أرقاماً صحيحة' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO product (name, type, cost_price, selling_price, owner_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.slice(0,255), type ? type.slice(0,100) : null, cost, sell, req.owner.id]
    );
    res.status(201).json({ message: '✅ تم إضافة المنتج بنجاح', product: result.rows[0] });
  } catch (err) {
    console.error('addProduct error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const updateProduct = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;
  const { name, type, cost_price, selling_price } = req.body;

  const cost = typeof cost_price !== 'undefined' ? Number(cost_price) : null;
  const sell = typeof selling_price !== 'undefined' ? Number(selling_price) : null;
  if ((cost !== null && Number.isNaN(cost)) || (sell !== null && Number.isNaN(sell))) {
    return res.status(400).json({ message: 'الأسعار يجب أن تكون أرقاماً صحيحة' });
  }

  try {
    const result = await pool.query(
      `UPDATE product SET 
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        cost_price = COALESCE($3, cost_price),
        selling_price = COALESCE($4, selling_price)
       WHERE id = $5 AND owner_id = $6 RETURNING *`,
      [name ? name.slice(0,255) : null, type ? type.slice(0,100) : null, cost, sell, id, req.owner.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: '✅ تم تعديل المنتج بنجاح', product: result.rows[0] });
  } catch (err) {
    console.error('updateProduct error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const deleteProduct = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;
  try {
    // تأكد أن أي معاملات تخص نفس المالك قبل منع الحذف
    const inUse = await pool.query(
      `SELECT COUNT(*) FROM transaction t
       JOIN product p ON t.product_id = p.id
       WHERE p.id = $1 AND p.owner_id = $2`,
      [id, req.owner.id]
    );
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(400).json({ message: '❌ لا يمكن حذف منتج مستخدم في عمليات' });
    }

    const result = await pool.query(
      'DELETE FROM product WHERE id = $1 AND owner_id = $2 RETURNING *',
      [id, req.owner.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json({ message: '✅ تم حذف المنتج بنجاح' });
  } catch (err) {
    console.error('deleteProduct error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

module.exports = { getAllProducts, addProduct, updateProduct, deleteProduct };
