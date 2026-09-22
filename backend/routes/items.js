const express = require('express');
const { dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, company, sort_by = 'name', sort_order = 'ASC' } = req.query;
    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];

    if (search) {
      query += ` AND (name LIKE ? OR model LIKE ? OR serial_no LIKE ? OR unique_code LIKE ? OR company LIKE ? OR hsn_code LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term);
    }
    if (company) { query += ' AND company = ?'; params.push(company); }

    const validSortColumns = ['name', 'rate', 'model', 'company', 'created_at', 'stock_qty'];
    const sortCol = validSortColumns.includes(sort_by) ? sort_by : 'name';
    const sortDir = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortCol} ${sortDir}`;

    const items = await dbAll(query, params);
    res.json(items);
  } catch (err) {
    console.error('Items list error:', err);
    res.status(500).json({ error: 'Failed to fetch items.' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const item = await dbGet('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch item.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, model, capacity, serial_no, unique_code, mf_year, company, rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty } = req.body;
    if (!name || rate === undefined) return res.status(400).json({ error: 'Item name and rate are required.' });

    const result = await dbRun(
      `INSERT INTO items (name, model, capacity, serial_no, unique_code, mf_year, company, rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), model || '', capacity || '', serial_no || '', unique_code || '', mf_year || '', company || '',
       Number(rate) || 0, Number(sgst_pct) || 6, Number(cgst_pct) || 6, Number(igst_pct) || 12,
       hsn_code || '', description || '', stock_qty !== undefined ? Number(stock_qty) : 1]
    );

    logAudit('item', result.lastInsertRowid, 'create', `Added item: ${name} (${model})`, req.user.username);
    const created = await dbGet('SELECT * FROM items WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Item create error:', err);
    res.status(500).json({ error: 'Failed to create item.' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, model, capacity, serial_no, unique_code, mf_year, company, rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty } = req.body;
    if (!name || rate === undefined) return res.status(400).json({ error: 'Item name and rate are required.' });

    await dbRun(
      `UPDATE items SET name=?, model=?, capacity=?, serial_no=?, unique_code=?, mf_year=?, company=?,
       rate=?, sgst_pct=?, cgst_pct=?, igst_pct=?, hsn_code=?, description=?, stock_qty=?, updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
      [name.trim(), model || '', capacity || '', serial_no || '', unique_code || '', mf_year || '', company || '',
       Number(rate) || 0, Number(sgst_pct) || 0, Number(cgst_pct) || 0, Number(igst_pct) || 0,
       hsn_code || '', description || '', Number(stock_qty) || 0, id]
    );

    logAudit('item', id, 'update', `Updated item: ${name}`, req.user.username);
    const updated = await dbGet('SELECT * FROM items WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Item update error:', err);
    res.status(500).json({ error: 'Failed to update item.' });
  }
});

router.post('/:id/duplicate', verifyToken, async (req, res) => {
  try {
    const original = await dbGet('SELECT * FROM items WHERE id = ?', [req.params.id]);
    if (!original) return res.status(404).json({ error: 'Original item not found.' });

    const result = await dbRun(
      `INSERT INTO items (name, model, capacity, serial_no, unique_code, mf_year, company, rate, sgst_pct, cgst_pct, igst_pct, hsn_code, description, stock_qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`${original.name} (Copy)`, original.model, original.capacity,
       original.serial_no ? `${original.serial_no}-NEW` : '', original.unique_code,
       original.mf_year, original.company, original.rate, original.sgst_pct, original.cgst_pct, original.igst_pct,
       original.hsn_code, original.description, 1]
    );

    logAudit('item', result.lastInsertRowid, 'create', `Duplicated item from ${original.name}`, req.user.username);
    const duplicated = await dbGet('SELECT * FROM items WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(duplicated);
  } catch (err) {
    console.error('Item duplicate error:', err);
    res.status(500).json({ error: 'Failed to duplicate item.' });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const item = await dbGet('SELECT name FROM items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    await dbRun('DELETE FROM items WHERE id = ?', [req.params.id]);
    logAudit('item', req.params.id, 'delete', `Deleted item ${item.name}`, req.user.username);
    res.json({ success: true, message: 'Item deleted.' });
  } catch (err) {
    console.error('Item delete error:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

module.exports = router;
