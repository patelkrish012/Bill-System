const express = require('express');
const { db } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// List all customers with aggregated billing stats
router.get('/', verifyToken, (req, res) => {
  const { search } = req.query;

  let query = `
    SELECT 
      c.*,
      COUNT(b.id) as total_bills,
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

  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

// Single customer details + customer-wise bills
router.get('/:id', verifyToken, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const bills = db.prepare(`
    SELECT id, bill_number, bill_date, net_total, payment_status, paid_amount, remaining_amount, created_at
    FROM bills 
    WHERE customer_id = ? 
    ORDER BY id DESC
  `).all(req.params.id);

  const stats = db.prepare(`
    SELECT 
      COUNT(id) as total_bills,
      COALESCE(SUM(net_total), 0) as total_purchases,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(remaining_amount), 0) as pending_balance
    FROM bills 
    WHERE customer_id = ?
  `).get(req.params.id);

  res.json({
    customer,
    bills,
    stats
  });
});

// Create customer
router.post('/', verifyToken, (req, res) => {
  const { name, address, village, taluka, district, state, mobile, gstin } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const stmt = db.prepare(`
    INSERT INTO customers (name, address, village, taluka, district, state, mobile, gstin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    address || '',
    village || '',
    taluka || '',
    district || '',
    state || 'Gujarat',
    mobile || '',
    gstin ? gstin.toUpperCase().trim() : ''
  );

  logAudit('customer', result.lastInsertRowid, 'create', `Created customer: ${name}`, req.user.username);
  
  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update customer
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, address, village, taluka, district, state, mobile, gstin } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  db.prepare(`
    UPDATE customers SET
      name = ?,
      address = ?,
      village = ?,
      taluka = ?,
      district = ?,
      state = ?,
      mobile = ?,
      gstin = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name.trim(),
    address || '',
    village || '',
    taluka || '',
    district || '',
    state || 'Gujarat',
    mobile || '',
    gstin ? gstin.toUpperCase().trim() : '',
    id
  );

  logAudit('customer', id, 'update', `Updated customer ${name}`, req.user.username);
  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json(updated);
});

// Delete customer
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  
  const billCount = db.prepare('SELECT COUNT(*) as count FROM bills WHERE customer_id = ?').get(id).count;
  if (billCount > 0) {
    return res.status(400).json({ 
      error: `Cannot delete customer with ${billCount} existing bills. Reassign or delete bills first.` 
    });
  }

  const customer = db.prepare('SELECT name FROM customers WHERE id = ?').get(id);
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);

  logAudit('customer', id, 'delete', `Deleted customer ${customer?.name || id}`, req.user.username);
  res.json({ success: true, message: 'Customer deleted successfully.' });
});

module.exports = router;
