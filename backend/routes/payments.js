const express = require('express');
const { db, dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { bill_id, customer_id, from_date, to_date } = req.query;
    let query = `
      SELECT p.*, b.bill_number, b.net_total, b.customer_name, b.customer_mobile
      FROM payments p JOIN bills b ON p.bill_id = b.id WHERE 1=1
    `;
    const params = [];
    if (bill_id) { query += ` AND p.bill_id = ?`; params.push(bill_id); }
    if (customer_id) { query += ` AND b.customer_id = ?`; params.push(customer_id); }
    if (from_date) { query += ` AND p.payment_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND p.payment_date <= ?`; params.push(to_date); }
    query += ` ORDER BY p.id DESC`;

    const payments = await dbAll(query, params);
    res.json(payments);
  } catch (err) {
    console.error('Payments list error:', err);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { bill_id, amount, payment_method = 'cash', transaction_ref = '', payment_date, notes = '' } = req.body;
    if (!bill_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid bill ID and positive payment amount are required.' });
    }

    const bill = await dbGet('SELECT id, bill_number, net_total, customer_name FROM bills WHERE id = ?', [bill_id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    const dateToUse = payment_date || new Date().toISOString().split('T')[0];
    const numAmount = Number(amount);

    // Use libsql transaction
    const tx = await db.transaction('write');
    let paymentId;
    try {
      const pResult = await tx.execute({
        sql: `INSERT INTO payments (bill_id, amount, payment_method, transaction_ref, payment_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [bill_id, numAmount, payment_method, transaction_ref, dateToUse, notes, req.user.username]
      });
      paymentId = Number(pResult.lastInsertRowid);

      const sumResult = await tx.execute({
        sql: 'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?',
        args: [bill_id]
      });
      const totalPaid = Number(sumResult.rows[0]?.total_paid || 0);
      const remaining = Math.max(0, bill.net_total - totalPaid);
      const status = totalPaid >= bill.net_total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

      await tx.execute({
        sql: `UPDATE bills SET paid_amount=?, remaining_amount=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [totalPaid, remaining, status, bill_id]
      });

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    logAudit('payment', paymentId, 'create', `Recorded payment of ₹${numAmount} for Bill ${bill.bill_number}`, req.user.username);
    const updatedBill = await dbGet('SELECT * FROM bills WHERE id = ?', [bill_id]);
    res.status(201).json({ success: true, paymentId, bill: updatedBill });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await dbGet('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    const billId = payment.bill_id;
    const bill = await dbGet('SELECT net_total, bill_number FROM bills WHERE id = ?', [billId]);

    const tx = await db.transaction('write');
    try {
      await tx.execute({ sql: 'DELETE FROM payments WHERE id = ?', args: [id] });

      if (bill) {
        const sumResult = await tx.execute({
          sql: 'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?',
          args: [billId]
        });
        const totalPaid = Number(sumResult.rows[0]?.total_paid || 0);
        const remaining = Math.max(0, bill.net_total - totalPaid);
        const status = totalPaid >= bill.net_total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending';

        await tx.execute({
          sql: `UPDATE bills SET paid_amount=?, remaining_amount=?, payment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
          args: [totalPaid, remaining, status, billId]
        });
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    logAudit('payment', id, 'delete', `Deleted payment of ₹${payment.amount} for Bill ${bill?.bill_number}`, req.user.username);
    res.json({ success: true, message: 'Payment deleted and bill balance updated.' });
  } catch (err) {
    console.error('Payment delete error:', err);
    res.status(500).json({ error: 'Failed to delete payment.' });
  }
});

module.exports = router;
