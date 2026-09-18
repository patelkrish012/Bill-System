const express = require('express');
const { db } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Get Audit Logs (Admin only)
router.get('/audit-logs', verifyToken, requireAdmin, (req, res) => {
  const { limit = 100, entity_type } = req.query;
  let query = 'SELECT * FROM audit_logs';
  const params = [];

  if (entity_type) {
    query += ' WHERE entity_type = ?';
    params.push(entity_type);
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(Number(limit));

  const logs = db.prepare(query).all(...params);
  res.json(logs);
});

// Full JSON Backup Export (Admin only)
router.get('/export-json', verifyToken, requireAdmin, (req, res) => {
  try {
    const backupData = {
      exported_at: new Date().toISOString(),
      business_settings: db.prepare('SELECT * FROM business_settings').all(),
      bank_details: db.prepare('SELECT * FROM bank_details').all(),
      terms_conditions: db.prepare('SELECT * FROM terms_conditions').all(),
      customers: db.prepare('SELECT * FROM customers').all(),
      items: db.prepare('SELECT * FROM items').all(),
      bills: db.prepare('SELECT * FROM bills').all(),
      bill_items: db.prepare('SELECT * FROM bill_items').all(),
      payments: db.prepare('SELECT * FROM payments').all(),
      audit_logs: db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=krish_agriculture_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Failed to generate backup.' });
  }
});

// CSV Export for Bills, Customers, or Items
router.get('/export-csv/:entity', verifyToken, requireAdmin, (req, res) => {
  const { entity } = req.params;

  function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '""';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\r\n');
  }

  try {
    if (entity === 'bills') {
      const bills = db.prepare(`
        SELECT bill_number, bill_date, customer_name, customer_mobile, customer_village, customer_district,
               subtotal, sgst_amount, cgst_amount, igst_amount, discount_amount, other_charges, round_off,
               net_total, payment_status, paid_amount, remaining_amount, created_at
        FROM bills ORDER BY id DESC
      `).all();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bills_export_${Date.now()}.csv`);
      return res.send(toCSV(bills));
    }

    if (entity === 'customers') {
      const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);
      return res.send(toCSV(customers));
    }

    if (entity === 'items') {
      const items = db.prepare('SELECT * FROM items ORDER BY name ASC').all();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=items_export_${Date.now()}.csv`);
      return res.send(toCSV(items));
    }

    return res.status(400).json({ error: 'Invalid export entity. Options: bills, customers, items.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

module.exports = router;
