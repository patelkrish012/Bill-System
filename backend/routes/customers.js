const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// List all customers
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT c.*, COUNT(b.id) as total_bills,
        COALESCE(SUM(b.net_total), 0) as total_purchase,
        COALESCE(SUM(b.remaining_amount), 0) as pending_amount,
        MAX(b.bill_date) as last_bill_date
      FROM customers c
      LEFT JOIN bills b ON c.id = b.customer_id
    `;
    const params = [];
    if (search) {
      query += ` WHERE (c.name LIKE ? OR c.mobile LIKE ? OR c.village LIKE ? OR c.district LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }
    query += ` GROUP BY c.id ORDER BY c.name ASC`;
    const customers = await dbAll(query, params);
    res.json(customers);
  } catch (err) {
    console.error('Customers list error:', err);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// Single customer
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const customer = await dbGet('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });

    const bills = await dbAll(
      `SELECT id, bill_number, bill_date, net_total, payment_status, paid_amount, remaining_amount, created_at
       FROM bills WHERE customer_id = ? ORDER BY id DESC`,
      [req.params.id]
    );
    const stats = await dbGet(
      `SELECT COUNT(id) as total_bills, COALESCE(SUM(net_total), 0) as total_purchases,
              COALESCE(SUM(paid_amount), 0) as total_paid, COALESCE(SUM(remaining_amount), 0) as pending_balance
       FROM bills WHERE customer_id = ?`,
      [req.params.id]
    );
    res.json({ customer, bills, stats });
  } catch (err) {
    console.error('Customer get error:', err);
    res.status(500).json({ error: 'Failed to fetch customer.' });
  }
});

// Create customer
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, address, village, taluka, district, state, mobile, gstin } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });

    const result = await dbRun(
      `INSERT INTO customers (name, address, village, taluka, district, state, mobile, gstin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), address || '', village || '', taluka || '', district || '', state || 'Gujarat', mobile || '', gstin ? gstin.toUpperCase().trim() : '']
    );

    logAudit('customer', result.lastInsertRowid, 'create', `Created customer: ${name}`, req.user.username);
    const created = await dbGet('SELECT * FROM customers WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Customer create error:', err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});

// Update customer
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, village, taluka, district, state, mobile, gstin } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });

    await dbRun(
      `UPDATE customers SET name=?, address=?, village=?, taluka=?, district=?, state=?, mobile=?, gstin=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name.trim(), address || '', village || '', taluka || '', district || '', state || 'Gujarat', mobile || '', gstin ? gstin.toUpperCase().trim() : '', id]
    );

    logAudit('customer', id, 'update', `Updated customer ${name}`, req.user.username);
    const updated = await dbGet('SELECT * FROM customers WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Customer update error:', err);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// Delete customer
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const billRow = await dbGet('SELECT COUNT(*) as count FROM bills WHERE customer_id = ?', [id]);
    const billCount = Number(billRow?.count || 0);
    if (billCount > 0) {
      return res.status(400).json({ error: `Cannot delete customer with ${billCount} existing bills.` });
    }
    const customer = await dbGet('SELECT name FROM customers WHERE id = ?', [id]);
    await dbRun('DELETE FROM customers WHERE id = ?', [id]);
    logAudit('customer', id, 'delete', `Deleted customer ${customer?.name || id}`, req.user.username);
    res.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (err) {
    console.error('Customer delete error:', err);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

module.exports = router;
