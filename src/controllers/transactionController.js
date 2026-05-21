const pool = require('../config/db');

const createTransaction = async (req, res) => {
  const { customer_name, product_id, product_name, shelf_id, quantity, amount_paid, payment_status, notes, type } = req.body;
  const owner_id = req.owner.id;
  try {
    const transaction_type = type || 'charging';

    if (transaction_type === 'charging') {
      if (!shelf_id) return res.status(400).json({ message: 'رقم الرف مطلوب لعمليات الشحن' });
      
      const shelf = await pool.query('SELECT * FROM shelf WHERE id = $1 AND owner_id = $2', [shelf_id, owner_id]);
      if (shelf.rows.length === 0) return res.status(404).json({ message: 'الرف غير موجود' });

      if (shelf.rows[0].is_occupied && shelf.rows[0].current_customer_id) {
        const occupiedCustomer = await pool.query('SELECT name FROM customer WHERE id = $1', [shelf.rows[0].current_customer_id]);
        const occupiedName = occupiedCustomer.rows[0]?.name;
        if (occupiedName?.toLowerCase() !== customer_name?.toLowerCase()) {
          return res.status(400).json({ message: `❌ الرف مشغول بزبون آخر: ${occupiedName}` });
        }
      }
    }

    let product;
    if (product_id) {
      product = await pool.query('SELECT * FROM product WHERE id = $1 AND owner_id = $2', [product_id, owner_id]);
    } else if (product_name) {
      product = await pool.query('SELECT * FROM product WHERE LOWER(name) = LOWER($1) AND owner_id = $2', [product_name, owner_id]);
    }
    if (!product || product.rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });

    const amount_due = product.rows[0].selling_price * (quantity || 1);

    let customer;
    const existingCustomer = await pool.query(
      'SELECT * FROM customer WHERE LOWER(name) = LOWER($1) AND owner_id = $2',
      [customer_name, owner_id]
    );
    if (existingCustomer.rows.length > 0) {
      customer = existingCustomer.rows[0];
    } else {
      const similarCustomer = await pool.query(
        "SELECT * FROM customer WHERE LOWER(name) LIKE LOWER($1) AND owner_id = $2",
        [`%${customer_name.split(' ')[0]}%`, owner_id]
      );
      if (similarCustomer.rows.length > 0 && customer_name.split(' ').length === 1) {
        return res.status(409).json({
          message: '⚠️ يوجد زبون بنفس الاسم، هل تريد إضافة الاسم الثلاثي للتمييز؟',
          similar: similarCustomer.rows.map(c => c.name)
        });
      }
      const newCustomer = await pool.query(
        'INSERT INTO customer (name, owner_id) VALUES ($1, $2) RETURNING *',
        [customer_name, owner_id]
      );
      customer = newCustomer.rows[0];
    }

    let final_amount_paid = amount_paid || 0;
    let final_payment_status = payment_status || 'debt';

    if (payment_status === 'balance') {
      const customerData = await pool.query('SELECT balance FROM customer WHERE id = $1', [customer.id]);
      const currentBalance = parseFloat(customerData.rows[0].balance);

      if (currentBalance >= amount_due) {
        final_amount_paid = amount_due;
        final_payment_status = 'paid';
        await pool.query('UPDATE customer SET balance = balance - $1 WHERE id = $2', [amount_due, customer.id]);
      } else if (currentBalance > 0) {
        final_amount_paid = currentBalance;
        final_payment_status = 'partial';
        await pool.query('UPDATE customer SET balance = 0 WHERE id = $1', [customer.id]);
      } else {
        final_amount_paid = 0;
        final_payment_status = 'debt';
      }
    }

    const final_shelf_id = transaction_type === 'charging' ? shelf_id : null;
    const final_status = transaction_type === 'sale' ? 'delivered' : 'pending';

    const result = await pool.query(
      `INSERT INTO transaction (customer_id, product_id, shelf_id, quantity, amount_due, amount_paid, payment_status, notes, type, status, delivered_at, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${transaction_type === 'sale' ? 'NOW()' : 'NULL'}, $11) RETURNING *`,
      [customer.id, product.rows[0].id, final_shelf_id, quantity || 1, amount_due, final_amount_paid, final_payment_status, notes, transaction_type, final_status, owner_id]
    );

    const remaining_debt = amount_due - final_amount_paid;
    if (remaining_debt > 0 && payment_status !== 'balance') {
      await pool.query('UPDATE customer SET balance = balance - $1 WHERE id = $2', [remaining_debt, customer.id]);
    }

    if (transaction_type === 'charging' && shelf_id) {
      await pool.query('UPDATE shelf SET is_occupied = true, current_customer_id = $1 WHERE id = $2', [customer.id, shelf_id]);
    }

    res.status(201).json({ message: '✅ تم تسجيل العملية بنجاح', transaction: result.rows[0], customer });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const deliverTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await pool.query(
      'SELECT * FROM transaction WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );
    if (transaction.rows.length === 0) return res.status(404).json({ message: 'العملية غير موجودة' });
    await pool.query('UPDATE transaction SET status = $1, delivered_at = NOW() WHERE id = $2', ['delivered', id]);
    if (transaction.rows[0].shelf_id) {
      await pool.query('UPDATE shelf SET is_occupied = false, current_customer_id = NULL WHERE id = $1', [transaction.rows[0].shelf_id]);
    }
    res.json({ message: '✅ تم تسليم الجهاز بنجاح' });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as customer_name, p.name as product_name, s.shelf_number
       FROM transaction t
       LEFT JOIN customer c ON t.customer_id = c.id
       LEFT JOIN product p ON t.product_id = p.id
       LEFT JOIN shelf s ON t.shelf_id = s.id
       WHERE t.owner_id = $1
       ORDER BY t.date DESC, t.received_at DESC`,
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getTodayTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as customer_name, p.name as product_name, s.shelf_number
       FROM transaction t
       LEFT JOIN customer c ON t.customer_id = c.id
       LEFT JOIN product p ON t.product_id = p.id
       LEFT JOIN shelf s ON t.shelf_id = s.id
       WHERE t.owner_id = $1 AND t.date = CURRENT_DATE
       ORDER BY t.received_at DESC`,
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getWeekTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as customer_name, p.name as product_name, s.shelf_number
       FROM transaction t
       LEFT JOIN customer c ON t.customer_id = c.id
       LEFT JOIN product p ON t.product_id = p.id
       LEFT JOIN shelf s ON t.shelf_id = s.id
       WHERE t.owner_id = $1 AND t.date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY t.date DESC, t.received_at DESC`,
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getMonthTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as customer_name, p.name as product_name, s.shelf_number
       FROM transaction t
       LEFT JOIN customer c ON t.customer_id = c.id
       LEFT JOIN product p ON t.product_id = p.id
       LEFT JOIN shelf s ON t.shelf_id = s.id
       WHERE t.owner_id = $1 AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY t.date DESC, t.received_at DESC`,
      [req.owner.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const getRangeTransactions = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: 'يجب تحديد تاريخ البداية والنهاية' });
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as customer_name, p.name as product_name, s.shelf_number
       FROM transaction t
       LEFT JOIN customer c ON t.customer_id = c.id
       LEFT JOIN product p ON t.product_id = p.id
       LEFT JOIN shelf s ON t.shelf_id = s.id
       WHERE t.owner_id = $1 AND t.date BETWEEN $2 AND $3
       ORDER BY t.date DESC, t.received_at DESC`,
      [req.owner.id, from, to]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const transaction = await pool.query(
      'SELECT * FROM transaction WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );
    if (transaction.rows.length === 0) return res.status(404).json({ message: 'العملية غير موجودة' });
    const tx = transaction.rows[0];
    if (parseFloat(tx.remaining_debt) > 0) {
      await pool.query('UPDATE customer SET balance = balance + $1 WHERE id = $2', [tx.remaining_debt, tx.customer_id]);
    }
    if (tx.status === 'pending' && tx.shelf_id) {
      await pool.query('UPDATE shelf SET is_occupied = false, current_customer_id = NULL WHERE id = $1', [tx.shelf_id]);
    }
    await pool.query('DELETE FROM transaction WHERE id = $1', [id]);
    res.json({ message: '✅ تم حذف العملية بنجاح' });
  } catch (err) {
    res.status(500).json({ message: '❌ خطأ في السيرفر', error: err.message });
  }
};

module.exports = { 
  createTransaction, 
  deliverTransaction, 
  getAllTransactions,
  getTodayTransactions,
  getWeekTransactions,
  getMonthTransactions,
  getRangeTransactions,
  deleteTransaction
};