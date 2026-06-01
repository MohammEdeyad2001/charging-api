// src/controllers/customerController.js
const pool = require('../config/db');

const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customer WHERE owner_id = $1 ORDER BY name ASC',
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getAllCustomers error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query(
      'SELECT * FROM customer WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });

    const transactions = await pool.query(
      `SELECT t.*, p.name as product_name FROM transaction t
       LEFT JOIN product p ON t.product_id = p.id
       WHERE t.customer_id = $1 ORDER BY t.date DESC`, [id]
    );
    res.json({ customer: customer.rows[0], transactions: transactions.rows });
  } catch (err) {
    console.error('getCustomerById error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const payDebt = async (req, res) => {
  const { id } = req.params;
  const { amount, note } = req.body;

  if (typeof amount === 'undefined' || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: 'قيمة المبلغ غير صحيحة' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerRes = await client.query(
      'SELECT * FROM customer WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [id, req.owner.id]
    );
    if (customerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'الزبون غير موجود' });
    }

    await client.query(
      'INSERT INTO debt_payment (customer_id, amount, note, paid_at) VALUES ($1, $2, $3, NOW())',
      [id, amount, note || null]
    );

    await client.query('UPDATE customer SET balance = balance + $1 WHERE id = $2', [amount, id]);

    let remaining = parseFloat(amount);
    const pendingTransactions = await client.query(
      `SELECT * FROM transaction WHERE customer_id = $1 AND remaining_debt > 0 ORDER BY date ASC, received_at ASC FOR UPDATE`,
      [id]
    );

    for (const tx of pendingTransactions.rows) {
      if (remaining <= 0) break;
      const debt = parseFloat(tx.remaining_debt || 0);
      if (debt <= 0) continue;
      const pay = Math.min(remaining, debt);
      const newAmountPaid = parseFloat(tx.amount_paid || 0) + pay;
      const newStatus = newAmountPaid >= parseFloat(tx.amount_due || 0) ? 'paid' : 'partial';
      await client.query(
        'UPDATE transaction SET amount_paid = $1, payment_status = $2, remaining_debt = GREATEST((amount_due - $1), 0) WHERE id = $3',
        [newAmountPaid, newStatus, tx.id]
      );
      remaining -= pay;
    }

    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    res.json({ message: '✅ تم تسجيل الدفعة بنجاح', customer: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('payDebt error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  } finally {
    client.release();
  }
};

const getDebtHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query(
      'SELECT * FROM customer WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });

    const debts = await pool.query(
      'SELECT * FROM debt_payment WHERE customer_id = $1 ORDER BY paid_at DESC',
      [id]
    );

    const totalPaid = debts.rows.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);

    res.json({
      customer: customer.rows[0],
      debt_history: debts.rows,
      total_paid: totalPaid
    });
  } catch (err) {
    console.error('getDebtHistory error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customer = await client.query(
      'SELECT * FROM customer WHERE id = $1 AND owner_id = $2 FOR UPDATE',
      [id, req.owner.id]
    );
    if (customer.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'الزبون غير موجود' });
    }

    if (parseFloat(customer.rows[0].balance || 0) < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: '❌ لا يمكن حذف زبون عليه ديون',
        balance: customer.rows[0].balance
      });
    }

    await client.query('DELETE FROM debt_payment WHERE customer_id = $1', [id]);
    await client.query('DELETE FROM transaction WHERE customer_id = $1', [id]);
    await client.query('DELETE FROM customer WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: '✅ تم حذف الزبون بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('deleteCustomer error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  } finally {
    client.release();
  }
};

module.exports = { getAllCustomers, getCustomerById, payDebt, getDebtHistory, deleteCustomer };
