const pool = require('../config/db');

const getAllShelves = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as customer_name
       FROM shelf s
       LEFT JOIN customer c ON s.current_customer_id = c.id
       WHERE s.owner_id = $1
       ORDER BY CAST(s.shelf_number AS INTEGER)`,
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const addShelf = async (req, res) => {
  const { shelf_number } = req.body;
  try {
    const existing = await pool.query(
      'SELECT * FROM shelf WHERE shelf_number = $1 AND owner_id = $2',
      [shelf_number, req.owner.id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'رقم الرف موجود مسبقاً' });
    }
    const result = await pool.query(
      'INSERT INTO shelf (shelf_number, owner_id) VALUES ($1, $2) RETURNING *',
      [shelf_number, req.owner.id]
    );
    res.status(201).json({ message: '✅ تم إضافة الرف بنجاح', shelf: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const deleteShelf = async (req, res) => {
  const { id } = req.params;
  try {
    const shelf = await pool.query(
      'SELECT * FROM shelf WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );
    if (shelf.rows.length === 0) {
      return res.status(404).json({ message: 'الرف غير موجود' });
    }
    if (shelf.rows[0].is_occupied) {
      return res.status(400).json({ message: '❌ لا يمكن حذف رف مشغول' });
    }
    await pool.query('DELETE FROM shelf WHERE id = $1', [id]);
    res.json({ message: '✅ تم حذف الرف بنجاح' });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const addMultipleShelves = async (req, res) => {
  const { count } = req.body;
  if (!count || count < 1) return res.status(400).json({ message: 'يجب تحديد عدد الرفوف' });
  try {
    const lastShelf = await pool.query(
      'SELECT MAX(CAST(shelf_number AS INTEGER)) as max_num FROM shelf WHERE owner_id = $1',
      [req.owner.id]
    );
    const startFrom = (lastShelf.rows[0].max_num || 0) + 1;
    const added = [];
    for (let i = startFrom; i < startFrom + count; i++) {
      const result = await pool.query(
        'INSERT INTO shelf (shelf_number, owner_id) VALUES ($1, $2) RETURNING *',
        [i.toString(), req.owner.id]
      );
      added.push(result.rows[0]);
    }
    res.status(201).json({ message: `✅ تم إضافة ${added.length} رف بنجاح`, shelves: added });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getAllShelves, addShelf, addMultipleShelves, deleteShelf };