const pool = require('../config/db');

const getDashboard = async (req, res) => {
  try {
    // إجمالي دخل اليوم
    const todayIncome = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total
       FROM transaction
       WHERE date = CURRENT_DATE`
    );

    // إجمالي الديون
    const totalDebts = await pool.query(
      `SELECT COALESCE(SUM(ABS(balance)), 0) as total
       FROM customer
       WHERE balance < 0`
    );

    // عدد العمليات اليوم
    const todayTransactions = await pool.query(
      `SELECT COUNT(*) as total
       FROM transaction
       WHERE date = CURRENT_DATE`
    );

    // الرفوف المشغولة
    const occupiedShelves = await pool.query(
      `SELECT s.shelf_number, c.name as customer_name
       FROM shelf s
       LEFT JOIN customer c ON s.current_customer_id = c.id
       WHERE s.is_occupied = true`
    );

    // الرفوف الفارغة
    const freeShelves = await pool.query(
      `SELECT COUNT(*) as total FROM shelf WHERE is_occupied = false`
    );

    // إجمالي الدخل الكلي
    const totalIncome = await pool.query(
      `SELECT COALESCE(SUM(amount_paid), 0) as total FROM transaction`
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