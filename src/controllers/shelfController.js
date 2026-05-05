const pool = require('../config/db');

// جلب كل الرفوف
const getAllShelves = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as customer_name
       FROM shelf s
       LEFT JOIN customer c ON s.current_customer_id = c.id
       ORDER BY s.shelf_number`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getAllShelves };