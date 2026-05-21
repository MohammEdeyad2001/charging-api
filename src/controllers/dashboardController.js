const pool = require('../config/db');

const getDashboard = async (req, res) => {
  const owner_id = req.owner.id;
  try {
    const todayIncome = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total
       FROM transaction
       WHERE owner_id = $1 AND date = CURRENT_DATE`,
      [owner_id]
    );

    const totalDebts = await pool.query(
      `SELECT COALESCE(SUM(ABS(balance)), 0) as total
       FROM customer
       WHERE owner_id = $1 AND balance < 0`,
      [owner_id]
    );

    const todayTransactions = await pool.query(
      `SELECT COUNT(*) as total
       FROM transaction
       WHERE owner_id = $1 AND date = CURRENT_DATE`,
      [owner_id]
    );

    const occupiedShelves = await pool.query(
      `SELECT s.shelf_number, c.name as customer_name
       FROM shelf s
       LEFT JOIN customer c ON s.current_customer_id = c.id
       WHERE s.owner_id = $1 AND s.is_occupied = true`,
      [owner_id]
    );

    const freeShelves = await pool.query(
      `SELECT COUNT(*) as total FROM shelf WHERE owner_id = $1 AND is_occupied = false`,
      [owner_id]
    );

    const totalIncome = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM transaction WHERE owner_id = $1`,
      [owner_id]
    );

    res.json({
      today: {
        income: todayIncome.rows[0].total,
        transactions: todayTransactions.rows[0].total,
      },
      total: {
        income: totalIncome.rows[0].total,
        debts: totalDebts.rows[0].total,
      },
      shelves: {
        occupied: occupiedShelves.rows,
        free_count: freeShelves.rows[0].total,
      }
    });

  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getDashboard };