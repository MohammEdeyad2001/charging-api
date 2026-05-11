const pool = require('../config/db');

const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customer ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });
    const transactions = await pool.query(
      `SELECT t.*, p.name as product_name FROM transaction t
       LEFT JOIN product p ON t.product_id = p.id
       WHERE t.customer_id = $1 ORDER BY t.date DESC`, [id]
    );
    res.json({ customer: customer.rows[0], transactions: transactions.rows });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const payDebt = async (req, res) => {
  const { id } = req.params;
  const { amount, note } = req.body;
  try {
    const customer = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });

    await pool.query('INSERT INTO debt_payment (customer_id, amount, note) VALUES ($1, $2, $3)', [id, amount, note]);
    await pool.query('UPDATE customer SET balance = balance + $1 WHERE id = $2', [amount, id]);

    let remaining = parseFloat(amount);
    const pendingTransactions = await pool.query(
      `SELECT * FROM transaction WHERE customer_id = $1 AND remaining_debt > 0 ORDER BY date ASC, received_at ASC`, [id]
    );

    for (const tx of pendingTransactions.rows) {
      if (remaining <= 0) break;
      const debt = parseFloat(tx.remaining_debt);
      const pay = Math.min(remaining, debt);
      await pool.query('UPDATE transaction SET amount_paid = amount_paid + $1 WHERE id = $2', [pay, tx.id]);
      remaining -= pay;
    }

    const updated = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    res.json({ message: '✅ تم تسجيل الدفعة بنجاح', customer: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getDebtHistory = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });

    const debts = await pool.query(
      `SELECT * FROM debt_payment WHERE customer_id = $1 ORDER BY paid_at DESC`, [id]
    );

    res.json({
      customer: customer.rows[0],
      debt_history: debts.rows,
      total_paid: debts.rows.reduce((sum, d) => sum + parseFloat(d.amount), 0)
    });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    const customer = await pool.query('SELECT * FROM customer WHERE id = $1', [id]);
    if (customer.rows.length === 0) return res.status(404).json({ message: 'الزبون غير موجود' });

    // تحقق إذا عليه ديون
    if (parseFloat(customer.rows[0].balance) < 0) {
      return res.status(400).json({ 
        message: '❌ لا يمكن حذف زبون عليه ديون',
        balance: customer.rows[0].balance
      });
    }

    // حذف سجل الديون
    await pool.query('DELETE FROM debt_payment WHERE customer_id = $1', [id]);
    
    // حذف العمليات
    await pool.query('DELETE FROM transaction WHERE customer_id = $1', [id]);
    
    // حذف الزبون
    await pool.query('DELETE FROM customer WHERE id = $1', [id]);

    res.json({ message: '✅ تم حذف الزبون بنجاح' });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { getAllCustomers, getCustomerById, payDebt, getDebtHistory, deleteCustomer };