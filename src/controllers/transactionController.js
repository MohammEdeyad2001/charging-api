// src/controllers/transactionController.js
const pool = require('../config/db');

const createTransaction = async (req, res) => {
  const {
    customer_name,
    product_id,
    product_name,
    shelf_number,
    quantity = 1,
    amount_paid = 0,
    payment_status,
    notes,
    type
  } = req.body;

  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;

  if (!customer_name || (!product_id && !product_name)) {
    return res.status(400).json({ message: 'الحقول customer_name و product_id أو product_name مطلوبة' });
  }

  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ message: 'الكمية غير صحيحة' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const transaction_type = type || 'charging';
    let resolved_shelf_id = null;

    // إذا نوع الشحنة يتطلب رف (نبحث عنه برقم الرف)
    if (transaction_type === 'charging') {
      if (!shelf_number) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'رقم الرف مطلوب لعمليات الشحن' });
      }
      // قفل صف الرف للتأكد من عدم تنافس (البحث برقم الرف + المالك)
      const shelfRes = await client.query(
        'SELECT * FROM shelf WHERE shelf_number = $1 AND owner_id = $2 FOR UPDATE',
        [shelf_number.toString(), owner_id]
      );
      if (shelfRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'رقم الرف غير موجود' });
      }
      const shelf = shelfRes.rows[0];
      resolved_shelf_id = shelf.id;
      if (shelf.is_occupied && shelf.current_customer_id) {
        const occRes = await client.query('SELECT name FROM customer WHERE id = $1', [shelf.current_customer_id]);
        const occupiedName = occRes.rows[0]?.name;
        if (occupiedName?.toLowerCase() !== customer_name?.toLowerCase()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `❌ الرف مشغول بزبون آخر: ${occupiedName}` });
        }
      }
    }

    // جلب المنتج والتأكد من ملكيته
    let productRes;
    if (product_id) {
      productRes = await client.query('SELECT * FROM product WHERE id = $1 AND owner_id = $2 FOR SHARE', [product_id, owner_id]);
    } else {
      productRes = await client.query('SELECT * FROM product WHERE LOWER(name) = LOWER($1) AND owner_id = $2 FOR SHARE', [product_name, owner_id]);
    }
    if (!productRes || productRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'المنتج غير موجود' });
    }
    const product = productRes.rows[0];

    const amount_due = Number(product.selling_price || 0) * qty;

    // إيجاد أو إنشاء الزبون مع قفل الصف
    let customer;
    const existingCustomer = await client.query(
      'SELECT * FROM customer WHERE LOWER(name) = LOWER($1) AND owner_id = $2 FOR UPDATE',
      [customer_name, owner_id]
    );
    if (existingCustomer.rows.length > 0) {
      customer = existingCustomer.rows[0];
    } else {
      // تحقق من تشابه الأسماء (اختياري)
      const similarCustomer = await client.query(
        "SELECT * FROM customer WHERE LOWER(name) LIKE LOWER($1) AND owner_id = $2",
        [`%${customer_name.split(' ')[0]}%`, owner_id]
      );
      if (similarCustomer.rows.length > 0 && customer_name.split(' ').length === 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: '⚠️ يوجد زبون بنفس الاسم، هل تريد إضافة الاسم الثلاثي للتمييز؟',
          similar: similarCustomer.rows.map(c => c.name)
        });
      }
      const newCustomer = await client.query(
        'INSERT INTO customer (name, owner_id, balance, created_at) VALUES ($1, $2, COALESCE($3,0), NOW()) RETURNING *',
        [customer_name, owner_id, 0]
      );
      customer = newCustomer.rows[0];
    }

    // حساب الدفع النهائي بناءً على payment_status
    let final_amount_paid = Number(amount_paid || 0);
    let final_payment_status = payment_status || 'debt';

    // افتراض: balance موجبة تعني رصيد للعميل يمكن استخدامه للدفع
    if (payment_status === 'balance') {
      const custBalRes = await client.query('SELECT balance FROM customer WHERE id = $1 FOR UPDATE', [customer.id]);
      const currentBalance = parseFloat(custBalRes.rows[0].balance || 0);

      if (currentBalance >= amount_due) {
        final_amount_paid = amount_due;
        final_payment_status = 'paid';
        await client.query('UPDATE customer SET balance = balance - $1 WHERE id = $2', [amount_due, customer.id]);
      } else if (currentBalance > 0) {
        final_amount_paid = currentBalance;
        final_payment_status = 'partial';
        await client.query('UPDATE customer SET balance = 0 WHERE id = $1', [customer.id]);
      } else {
        final_amount_paid = 0;
        final_payment_status = 'debt';
      }
    }

    const final_shelf_id = transaction_type === 'charging' ? resolved_shelf_id : null;
    const final_status = transaction_type === 'sale' ? 'delivered' : 'pending';
    const deliveredAtExpr = transaction_type === 'sale' ? 'NOW()' : 'NULL';
    const remaining_debt = Math.max(amount_due - final_amount_paid, 0);

    // إدراج العملية (remaining_debt عمود محسوب تلقائياً - لا يُدرج يدوياً)
    const insertQuery = `
      INSERT INTO transaction
      (customer_id, product_id, shelf_id, quantity, amount_due, amount_paid, payment_status, notes, type, status, delivered_at, owner_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ${deliveredAtExpr}, $11)
      RETURNING *
    `;
    const insertValues = [
      customer.id,
      product.id,
      final_shelf_id,
      qty,
      amount_due,
      final_amount_paid,
      final_payment_status,
      notes || null,
      transaction_type,
      final_status,
      owner_id
    ];

    const result = await client.query(insertQuery, insertValues);

    // إذا تبقى دين و لم يكن الدفع من الرصيد، نخصم من رصيد العميل (يصبح سالباً = دين)
    if (remaining_debt > 0 && payment_status !== 'balance') {
      await client.query('UPDATE customer SET balance = balance - $1 WHERE id = $2', [remaining_debt, customer.id]);
    }

    // تحديث حالة الرف إذا كانت عملية شحن
    if (transaction_type === 'charging' && final_shelf_id) {
      await client.query('UPDATE shelf SET is_occupied = true, current_customer_id = $1 WHERE id = $2', [customer.id, final_shelf_id]);
    }

    await client.query('COMMIT');

    res.status(201).json({ message: '✅ تم تسجيل العملية بنجاح', transaction: result.rows[0], customer });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('createTransaction error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  } finally {
    client.release();
  }
};

const deliverTransaction = async (req, res) => {
  const { id } = req.params;
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const owner_id = req.owner.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txRes = await client.query('SELECT * FROM transaction WHERE id = $1 AND owner_id = $2 FOR UPDATE', [id, owner_id]);
    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'العملية غير موجودة' });
    }
    const tx = txRes.rows[0];
    await client.query('UPDATE transaction SET status = $1, delivered_at = NOW() WHERE id = $2', ['delivered', id]);
    if (tx.shelf_id) {
      await client.query('UPDATE shelf SET is_occupied = false, current_customer_id = NULL WHERE id = $1', [tx.shelf_id]);
    }
    await client.query('COMMIT');
    res.json({ message: '✅ تم تسليم الجهاز بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('deliverTransaction error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  } finally {
    client.release();
  }
};

const getAllTransactions = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
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
    console.error('getAllTransactions error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const getTodayTransactions = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
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
    console.error('getTodayTransactions error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const getWeekTransactions = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
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
    console.error('getWeekTransactions error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const getMonthTransactions = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
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
    console.error('getMonthTransactions error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const getRangeTransactions = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
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
    console.error('getRangeTransactions error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  }
};

const deleteTransaction = async (req, res) => {
  if (!req.owner) return res.status(401).json({ message: 'Unauthorized' });
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const txRes = await client.query('SELECT * FROM transaction WHERE id = $1 AND owner_id = $2 FOR UPDATE', [id, req.owner.id]);
    if (txRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'العملية غير موجودة' });
    }
    const tx = txRes.rows[0];
    if (parseFloat(tx.remaining_debt || 0) > 0) {
      await client.query('UPDATE customer SET balance = balance + $1 WHERE id = $2', [tx.remaining_debt, tx.customer_id]);
    }
    if (tx.status === 'pending' && tx.shelf_id) {
      await client.query('UPDATE shelf SET is_occupied = false, current_customer_id = NULL WHERE id = $1', [tx.shelf_id]);
    }
    await client.query('DELETE FROM transaction WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ message: '✅ تم حذف العملية بنجاح' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('deleteTransaction error:', err && err.message ? err.message : err);
    res.status(500).json({ message: '❌ خطأ في السيرفر' });
  } finally {
    client.release();
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