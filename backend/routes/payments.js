const express = require('express');
const { db } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// List payments with bill and customer details
router.get('/', verifyToken, (req, res) => {
  const { bill_id, customer_id, from_date, to_date } = req.query;

  let query = `
    SELECT 
      p.*,
      b.bill_number,
      b.net_total,
      b.customer_name,
      b.customer_mobile
    FROM payments p
    JOIN bills b ON p.bill_id = b.id
    WHERE 1=1
  `;
  const params = [];

  if (bill_id) {
    query += ` AND p.bill_id = ?`;
    params.push(bill_id);
  }
  if (customer_id) {
    query += ` AND b.customer_id = ?`;
    params.push(customer_id);
  }
  if (from_date) {
    query += ` AND p.payment_date >= ?`;
    params.push(from_date);
  }
  if (to_date) {
    query += ` AND p.payment_date <= ?`;
    params.push(to_date);
  }

  query += ` ORDER BY p.id DESC`;

  const payments = db.prepare(query).all(...params);
  res.json(payments);
});

// Record new payment for a bill
router.post('/', verifyToken, (req, res) => {
  const { bill_id, amount, payment_method = 'cash', transaction_ref = '', payment_date, notes = '' } = req.body;

  if (!bill_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid bill ID and positive payment amount are required.' });
  }

  const bill = db.prepare('SELECT id, bill_number, net_total, customer_name FROM bills WHERE id = ?').get(bill_id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  const dateToUse = payment_date || new Date().toISOString().split('T')[0];
  const numAmount = Number(amount);

  const tx = db.transaction(() => {
    // 1. Insert payment record
    const insertStmt = db.prepare(`
      INSERT INTO payments (bill_id, amount, payment_method, transaction_ref, payment_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const pResult = insertStmt.run(
      bill_id,
      numAmount,
      payment_method,
      transaction_ref,
      dateToUse,
      notes,
      req.user.username
    );

    // 2. Recalculate total paid on this bill
    const sumResult = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?').get(bill_id);
    const totalPaid = sumResult.total_paid;
    const remaining = Math.max(0, bill.net_total - totalPaid);

    let status = 'pending';
    if (totalPaid >= bill.net_total) {
      status = 'paid';
    } else if (totalPaid > 0) {
      status = 'partial';
    }

    db.prepare(`
      UPDATE bills SET
        paid_amount = ?,
        remaining_amount = ?,
        payment_status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(totalPaid, remaining, status, bill_id);

    return pResult.lastInsertRowid;
  });

  try {
    const paymentId = tx();
    logAudit('payment', paymentId, 'create', `Recorded payment of ₹${numAmount} for Bill ${bill.bill_number} (${payment_method})`, req.user.username);
    
    const updatedBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(bill_id);
    res.status(201).json({ success: true, paymentId, bill: updatedBill });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

// Delete a payment
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);

  if (!payment) {
    return res.status(404).json({ error: 'Payment record not found.' });
  }

  const billId = payment.bill_id;
  const bill = db.prepare('SELECT net_total, bill_number FROM bills WHERE id = ?').get(billId);

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM payments WHERE id = ?').run(id);

    if (bill) {
      const sumResult = db.prepare('SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = ?').get(billId);
      const totalPaid = sumResult.total_paid;
      const remaining = Math.max(0, bill.net_total - totalPaid);

      let status = 'pending';
      if (totalPaid >= bill.net_total) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      db.prepare(`
        UPDATE bills SET
          paid_amount = ?,
          remaining_amount = ?,
          payment_status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalPaid, remaining, status, billId);
    }
  });

  try {
    tx();
    logAudit('payment', id, 'delete', `Deleted payment of ₹${payment.amount} for Bill ${bill?.bill_number}`, req.user.username);
    res.json({ success: true, message: 'Payment deleted and bill balance updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payment.' });
  }
});

module.exports = router;
