const express = require('express');
const { dbAll, dbGet } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/audit-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, entity_type } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const params = [];
    if (entity_type) { query += ' WHERE entity_type = ?'; params.push(entity_type); }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Number(limit));
    const logs = await dbAll(query, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});

router.get('/export-json', verifyToken, requireAdmin, async (req, res) => {
  try {
    const backupData = {
      exported_at: new Date().toISOString(),
      business_settings: await dbAll('SELECT * FROM business_settings'),
      bank_details: await dbAll('SELECT * FROM bank_details'),
      terms_conditions: await dbAll('SELECT * FROM terms_conditions'),
      customers: await dbAll('SELECT * FROM customers'),
      items: await dbAll('SELECT * FROM items'),
      bills: await dbAll('SELECT * FROM bills'),
      bill_items: await dbAll('SELECT * FROM bill_items'),
      payments: await dbAll('SELECT * FROM payments'),
      audit_logs: await dbAll('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500')
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=krish_agriculture_backup_${Date.now()}.json`);
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Failed to generate backup.' });
  }
});

router.get('/export-csv/:entity', verifyToken, requireAdmin, async (req, res) => {
  function toCSV(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map(h => {
        let val = row[h];
        if (val === null || val === undefined) return '""';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\r\n');
  }

  try {
    const { entity } = req.params;
    if (entity === 'bills') {
      const bills = await dbAll(`SELECT bill_number, bill_date, customer_name, customer_mobile, customer_village, customer_district, subtotal, sgst_amount, cgst_amount, igst_amount, discount_amount, other_charges, round_off, net_total, payment_status, paid_amount, remaining_amount, created_at FROM bills ORDER BY id DESC`);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bills_export_${Date.now()}.csv`);
      return res.send(toCSV(bills));
    }
    if (entity === 'customers') {
      const customers = await dbAll('SELECT * FROM customers ORDER BY name ASC');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=customers_export_${Date.now()}.csv`);
      return res.send(toCSV(customers));
    }
    if (entity === 'items') {
      const items = await dbAll('SELECT * FROM items ORDER BY name ASC');
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
