// src/controllers/dashboardController.js
const pool = require('../config/db');

const getDashboard = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;

  try {
    // دخلنا كل استعلامات داخل اتصالات مستقلة لكن مع ضمان owner_id
    const [
      todayIncomeRes,
      totalDebtsRes,
      todayTransactionsRes,
      occupiedShelvesRes,
      freeShelvesRes,
      totalIncomeRes
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total
         FROM transaction
         WHERE owner_id = $1 AND date = CURRENT_DATE`,
        [owner_id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(CASE WHEN balance < 0 THEN ABS(balance) ELSE 0 END), 0) AS total
         FROM customer
         WHERE owner_id = $1`,
        [owner_id]
      ),
      pool.query(
        `SELECT COUNT(*) AS total
         FROM transaction
         WHERE owner_id = $1 AND date = CURRENT_DATE`,
        [owner_id]
      ),
      pool.query(
        `SELECT s.shelf_number, c.name AS customer_name
         FROM shelf s
         LEFT JOIN customer c ON s.current_customer_id = c.id
         WHERE s.owner_id = $1 AND s.is_occupied = true
         ORDER BY CASE WHEN s.shelf_number ~ '^[0-9]+$' THEN CAST(s.shelf_number AS INTEGER) ELSE NULL END, s.shelf_number
         LIMIT 200`,
        [owner_id]
      ),
      pool.query(
        `SELECT COUNT(*) AS total FROM shelf WHERE owner_id = $1 AND is_occupied = false`,
        [owner_id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total FROM transaction WHERE owner_id = $1`,
        [owner_id]
      )
    ]);

    // تحويل القيم النصية إلى أرقام ثابتة في JSON
    const todayIncome = parseFloat(todayIncomeRes.rows[0].total) || 0;
    const totalDebts = parseFloat(totalDebtsRes.rows[0].total) || 0;
    const todayTransactions = parseInt(todayTransactionsRes.rows[0].total, 10) || 0;
    const freeShelvesCount = parseInt(freeShelvesRes.rows[0].total, 10) || 0;
    const totalIncome = parseFloat(totalIncomeRes.rows[0].total) || 0;

    res.json({
      today: {
        income: todayIncome,
        transactions: todayTransactions
      },
      total: {
        income: totalIncome,
        debts: totalDebts
      },
      shelves: {
        occupied: occupiedShelvesRes.rows, // مصفوفة من الرفوف المشغولة مع اسم الزبون إن وجد
        free_count: freeShelvesCount
      }
    });
  } catch (err) {
    console.error('getDashboard error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

module.exports = { getDashboard };
