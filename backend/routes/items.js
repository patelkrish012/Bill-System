const express = require('express');
const { db } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Get items with search, filtering, and sorting
router.get('/', verifyToken, (req, res) => {
  const { search, company, sort_by = 'name', sort_order = 'ASC' } = req.query;

  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (search) {
    query += ` AND (
      name LIKE ? OR 
      model LIKE ? OR 
      serial_no LIKE ? OR 
      unique_code LIKE ? OR 
      company LIKE ? OR
      hsn_code LIKE ?
    )`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term, term);
  }

  if (company) {
    query += ' AND company = ?';
    params.push(company);
  }

  const validSortColumns = ['name', 'rate', 'model', 'company', 'created_at', 'stock_qty'];
  const sortCol = validSortColumns.includes(sort_by) ? sort_by : 'name';
  const sortDir = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  query += ` ORDER BY ${sortCol} ${sortDir}`;

  const items = db.prepare(query).all(...params);
  res.json(items);
});

// Single item
router.get('/:id', verifyToken, (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }
  res.json(item);
});

// Create item
router.post('/', verifyToken, (req, res) => {
  const {
    name,
    model,
    capacity,
    serial_no,
    unique_code,
    mf_year,
    company,
    rate,
    sgst_pct,
    cgst_pct,
    igst_pct,
    hsn_code,
    description,
    stock_qty
  } = req.body;

  if (!name || rate === undefined) {
    return res.status(400).json({ error: 'Item name and rate are required.' });
  }

  const stmt = db.prepare(`
    INSERT INTO items (
      name, model, capacity, serial_no, unique_code, mf_year, company,
      rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    model || '',
    capacity || '',
    serial_no || '',
    unique_code || '',
    mf_year || '',
    company || '',
    Number(rate) || 0,
    Number(sgst_pct) !== undefined ? Number(sgst_pct) : 6,
    Number(cgst_pct) !== undefined ? Number(cgst_pct) : 6,
    Number(igst_pct) !== undefined ? Number(igst_pct) : 12,
    hsn_code || '',
    description || '',
    stock_qty !== undefined ? Number(stock_qty) : 1
  );

  logAudit('item', result.lastInsertRowid, 'create', `Added item: ${name} (${model})`, req.user.username);
  const created = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update item
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const {
    name,
    model,
    capacity,
    serial_no,
    unique_code,
    mf_year,
    company,
    rate,
    sgst_pct,
    cgst_pct,
    igst_pct,
    hsn_code,
    description,
    stock_qty
  } = req.body;

  if (!name || rate === undefined) {
    return res.status(400).json({ error: 'Item name and rate are required.' });
  }

  db.prepare(`
    UPDATE items SET
      name = ?,
      model = ?,
      capacity = ?,
      serial_no = ?,
      unique_code = ?,
      mf_year = ?,
      company = ?,
      rate = ?,
      sgst_pct = ?,
      cgst_pct = ?,
      igst_pct = ?,
      hsn_code = ?,
      description = ?,
      stock_qty = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name.trim(),
    model || '',
    capacity || '',
    serial_no || '',
    unique_code || '',
    mf_year || '',
    company || '',
    Number(rate) || 0,
    Number(sgst_pct) || 0,
    Number(cgst_pct) || 0,
    Number(igst_pct) || 0,
    hsn_code || '',
    description || '',
    Number(stock_qty) || 0,
    id
  );

  logAudit('item', id, 'update', `Updated item: ${name}`, req.user.username);
  const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  res.json(updated);
});

// Duplicate item
router.post('/:id/duplicate', verifyToken, (req, res) => {
  const { id } = req.params;
  const original = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  
  if (!original) {
    return res.status(404).json({ error: 'Original item not found.' });
  }

  const newName = `${original.name} (Copy)`;
  const newSerial = original.serial_no ? `${original.serial_no}-NEW` : '';

  const stmt = db.prepare(`
    INSERT INTO items (
      name, model, capacity, serial_no, unique_code, mf_year, company,
      rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    newName,
    original.model,
    original.capacity,
    newSerial,
    original.unique_code,
    original.mf_year,
    original.company,
    original.rate,
    original.sgst_pct,
    original.cgst_pct,
    original.igst_pct,
    original.hsn_code,
    original.description,
    1
  );

  logAudit('item', result.lastInsertRowid, 'create', `Duplicated item from ${original.name}`, req.user.username);
  const duplicated = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(duplicated);
});

// Delete item
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const item = db.prepare('SELECT name FROM items WHERE id = ?').get(id);

  if (!item) {
    return res.status(404).json({ error: 'Item not found.' });
  }

  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  logAudit('item', id, 'delete', `Deleted item ${item.name}`, req.user.username);
  res.json({ success: true, message: 'Item deleted.' });
});

module.exports = router;
