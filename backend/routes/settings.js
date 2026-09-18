const express = require('express');
const { db } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Get all settings (Business info, Banks, Terms)
router.get('/', verifyToken, (req, res) => {
  const business = db.prepare('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1').get();
  const banks = db.prepare('SELECT * FROM bank_details WHERE is_active = 1 ORDER BY is_default DESC, id ASC').all();
  const terms = db.prepare('SELECT * FROM terms_conditions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();

  res.json({
    business,
    banks,
    terms
  });
});

// Update Business Info (Admin Only)
router.put('/business', verifyToken, requireAdmin, (req, res) => {
  const {
    business_name,
    tagline,
    gstin,
    mobile,
    email,
    address,
    starting_bill_no
  } = req.body;

  if (!business_name || !gstin) {
    return res.status(400).json({ error: 'Business name and GSTIN are required.' });
  }

  const current = db.prepare('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1').get();

  db.prepare(`
    UPDATE business_settings SET
      business_name = ?,
      tagline = ?,
      gstin = ?,
      mobile = ?,
      email = ?,
      address = ?,
      starting_bill_no = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    business_name,
    tagline || '',
    gstin.toUpperCase(),
    mobile || '',
    email || '',
    address || '',
    Number(starting_bill_no) || current.starting_bill_no,
    current.id
  );

  logAudit('settings', current.id, 'update', `Updated business information: ${business_name}, GSTIN: ${gstin}`, req.user.username);

  const updated = db.prepare('SELECT * FROM business_settings WHERE id = ?').get(current.id);
  res.json({ success: true, message: 'Business settings updated successfully.', business: updated });
});

// Bank Details Endpoints (Admin Only)
router.post('/bank', verifyToken, requireAdmin, (req, res) => {
  const { bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default } = req.body;

  if (!bank_name || !account_number || !ifsc_code) {
    return res.status(400).json({ error: 'Bank name, account number, and IFSC code are required.' });
  }

  if (is_default) {
    db.prepare('UPDATE bank_details SET is_default = 0').run();
  }

  const result = db.prepare(`
    INSERT INTO bank_details (bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    bank_name,
    account_holder || 'KRISH AGRICULTURE',
    account_number,
    ifsc_code.toUpperCase(),
    branch || '',
    upi_id || '',
    is_default ? 1 : 0
  );

  logAudit('settings', result.lastInsertRowid, 'create', `Added bank account: ${bank_name} - ${account_number}`, req.user.username);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/bank/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default } = req.body;

  if (is_default) {
    db.prepare('UPDATE bank_details SET is_default = 0 WHERE id != ?').run(id);
  }

  db.prepare(`
    UPDATE bank_details SET
      bank_name = ?,
      account_holder = ?,
      account_number = ?,
      ifsc_code = ?,
      branch = ?,
      upi_id = ?,
      is_default = ?
    WHERE id = ?
  `).run(
    bank_name,
    account_holder,
    account_number,
    ifsc_code.toUpperCase(),
    branch,
    upi_id,
    is_default ? 1 : 0,
    id
  );

  logAudit('settings', id, 'update', `Updated bank account ${bank_name}`, req.user.username);
  res.json({ success: true, message: 'Bank details updated.' });
});

router.delete('/bank/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE bank_details SET is_active = 0 WHERE id = ?').run(id);
  logAudit('settings', id, 'delete', `Deactivated bank account id ${id}`, req.user.username);
  res.json({ success: true, message: 'Bank details removed.' });
});

// Terms & Conditions Endpoints (Admin Only)
router.post('/terms', verifyToken, requireAdmin, (req, res) => {
  const { term_text } = req.body;
  if (!term_text) {
    return res.status(400).json({ error: 'Term text cannot be empty.' });
  }

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM terms_conditions').get().m || 0;
  const result = db.prepare('INSERT INTO terms_conditions (term_text, sort_order) VALUES (?, ?)').run(term_text, maxOrder + 1);

  logAudit('settings', result.lastInsertRowid, 'create', `Added term: ${term_text.substring(0, 30)}`, req.user.username);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/terms/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { term_text, sort_order } = req.body;

  db.prepare('UPDATE terms_conditions SET term_text = ?, sort_order = ? WHERE id = ?').run(
    term_text,
    Number(sort_order) || 0,
    id
  );

  logAudit('settings', id, 'update', `Updated term id ${id}`, req.user.username);
  res.json({ success: true, message: 'Term updated.' });
});

router.delete('/terms/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE terms_conditions SET is_active = 0 WHERE id = ?').run(id);
  logAudit('settings', id, 'delete', `Removed term id ${id}`, req.user.username);
  res.json({ success: true, message: 'Term removed.' });
});

module.exports = router;
