// src/controllers/dashboardController.js
const pool = require('../config/db');

const getDashboard = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;

  try {
    const [
      todayIncomeRes,
      totalDebtsRes,
      todayTransactionsRes,
      occupiedShelvesRes,
      freeShelvesRes,
      totalIncomeRes,
      customerBalancesRes
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
      ),
      // مجموع أرصدة العملاء الموجبة (الخزينة)
      pool.query(
        `SELECT COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS total
         FROM customer
         WHERE owner_id = $1`,
        [owner_id]
      )
    ]);

    const todayIncome = parseFloat(todayIncomeRes.rows[0].total) || 0;
    const totalDebts = parseFloat(totalDebtsRes.rows[0].total) || 0;
    const todayTransactions = parseInt(todayTransactionsRes.rows[0].total, 10) || 0;
    const freeShelvesCount = parseInt(freeShelvesRes.rows[0].total, 10) || 0;
    const totalIncome = parseFloat(totalIncomeRes.rows[0].total) || 0;
    const customerBalances = parseFloat(customerBalancesRes.rows[0].total) || 0;
    const occupiedCount = occupiedShelvesRes.rows.length;

    res.json({
      today: {
        income: todayIncome,
        transactions: todayTransactions
      },
      total: {
        income: totalIncome,
        debts: totalDebts,
        customer_balances: customerBalances
      },
      shelves: {
        occupied: occupiedShelvesRes.rows,
        occupied_count: occupiedCount,
        free_count: freeShelvesCount
      }
    });
  } catch (err) {
    console.error('getDashboard error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

// العملاء الذين عليهم ديون (balance < 0)
const getDebtors = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;

  try {
    const result = await pool.query(
      `SELECT id, name, phone, balance, created_at
       FROM customer
       WHERE owner_id = $1 AND balance < 0
       ORDER BY balance ASC`,
      [owner_id]
    );

    const totalDebts = result.rows.reduce(
      (sum, c) => sum + Math.abs(parseFloat(c.balance || 0)),
      0
    );

    res.json({
      debtors: result.rows,
      total_debts: totalDebts,
      count: result.rows.length
    });
  } catch (err) {
    console.error('getDebtors error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

// العملاء الذين لهم رصيد موجب (balance > 0)
const getCustomersWithBalance = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;

  try {
    const result = await pool.query(
      `SELECT id, name, phone, balance, created_at
       FROM customer
       WHERE owner_id = $1 AND balance > 0
       ORDER BY balance DESC`,
      [owner_id]
    );

    const totalBalance = result.rows.reduce(
      (sum, c) => sum + parseFloat(c.balance || 0),
      0
    );

    res.json({
      customers: result.rows,
      total_balance: totalBalance,
      count: result.rows.length
    });
  } catch (err) {
    console.error('getCustomersWithBalance error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

module.exports = { getDashboard, getDebtors, getCustomersWithBalance };