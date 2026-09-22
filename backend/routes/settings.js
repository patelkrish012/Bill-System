const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const business = await dbGet('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1');
    const banks = await dbAll('SELECT * FROM bank_details WHERE is_active = 1 ORDER BY is_default DESC, id ASC');
    const terms = await dbAll('SELECT * FROM terms_conditions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    res.json({ business, banks, terms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

router.put('/business', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { business_name, tagline, gstin, mobile, email, address, starting_bill_no } = req.body;
    if (!business_name || !gstin) return res.status(400).json({ error: 'Business name and GSTIN are required.' });

    const current = await dbGet('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1');
    await dbRun(
      `UPDATE business_settings SET business_name=?, tagline=?, gstin=?, mobile=?, email=?, address=?, starting_bill_no=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [business_name, tagline || '', gstin.toUpperCase(), mobile || '', email || '', address || '',
       Number(starting_bill_no) || current.starting_bill_no, current.id]
    );

    logAudit('settings', current.id, 'update', `Updated business information: ${business_name}`, req.user.username);
    const updated = await dbGet('SELECT * FROM business_settings WHERE id = ?', [current.id]);
    res.json({ success: true, message: 'Business settings updated successfully.', business: updated });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

router.post('/bank', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default } = req.body;
    if (!bank_name || !account_number || !ifsc_code) {
      return res.status(400).json({ error: 'Bank name, account number, and IFSC code are required.' });
    }
    if (is_default) await dbRun('UPDATE bank_details SET is_default = 0');
    const result = await dbRun(
      `INSERT INTO bank_details (bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [bank_name, account_holder || 'KRISH AGRICULTURE', account_number, ifsc_code.toUpperCase(), branch || '', upi_id || '', is_default ? 1 : 0]
    );
    logAudit('settings', result.lastInsertRowid, 'create', `Added bank account: ${bank_name}`, req.user.username);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add bank.' });
  }
});

router.put('/bank/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default } = req.body;
    if (is_default) await dbRun('UPDATE bank_details SET is_default = 0 WHERE id != ?', [id]);
    await dbRun(
      `UPDATE bank_details SET bank_name=?, account_holder=?, account_number=?, ifsc_code=?, branch=?, upi_id=?, is_default=? WHERE id=?`,
      [bank_name, account_holder, account_number, ifsc_code.toUpperCase(), branch, upi_id, is_default ? 1 : 0, id]
    );
    logAudit('settings', id, 'update', `Updated bank account ${bank_name}`, req.user.username);
    res.json({ success: true, message: 'Bank details updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bank.' });
  }
});

router.delete('/bank/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await dbRun('UPDATE bank_details SET is_active = 0 WHERE id = ?', [req.params.id]);
    logAudit('settings', req.params.id, 'delete', `Deactivated bank account id ${req.params.id}`, req.user.username);
    res.json({ success: true, message: 'Bank details removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove bank.' });
  }
});

router.post('/terms', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { term_text } = req.body;
    if (!term_text) return res.status(400).json({ error: 'Term text cannot be empty.' });
    const maxRow = await dbGet('SELECT MAX(sort_order) as m FROM terms_conditions');
    const maxOrder = Number(maxRow?.m || 0);
    const result = await dbRun('INSERT INTO terms_conditions (term_text, sort_order) VALUES (?, ?)', [term_text, maxOrder + 1]);
    logAudit('settings', result.lastInsertRowid, 'create', `Added term: ${term_text.substring(0, 30)}`, req.user.username);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add term.' });
  }
});

router.put('/terms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { term_text, sort_order } = req.body;
    await dbRun('UPDATE terms_conditions SET term_text=?, sort_order=? WHERE id=?', [term_text, Number(sort_order) || 0, id]);
    logAudit('settings', id, 'update', `Updated term id ${id}`, req.user.username);
    res.json({ success: true, message: 'Term updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update term.' });
  }
});

router.delete('/terms/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    await dbRun('UPDATE terms_conditions SET is_active = 0 WHERE id = ?', [req.params.id]);
    logAudit('settings', req.params.id, 'delete', `Removed term id ${req.params.id}`, req.user.username);
    res.json({ success: true, message: 'Term removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove term.' });
  }
});

module.exports = router;
