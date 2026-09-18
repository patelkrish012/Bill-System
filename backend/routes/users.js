const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// List all users (Admin only)
router.get('/', verifyToken, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC').all();
  res.json(users);
});

// Create new user (Admin only)
router.post('/', verifyToken, requireAdmin, (req, res) => {
  const { username, email, password, full_name, role = 'user' } = req.body;

  if (!username || !password || !full_name) {
    return res.status(400).json({ error: 'Username, password, and full name are required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ error: `Username '${username}' is already taken.` });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const stmt = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(username.trim(), email || '', hash, full_name.trim(), role);
  logAudit('user', result.lastInsertRowid, 'create', `Created new user ${username} (${role})`, req.user.username);

  const created = db.prepare('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update user (Admin only)
router.put('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { email, full_name, role, is_active, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
  }

  db.prepare(`
    UPDATE users SET
      email = ?,
      full_name = ?,
      role = ?,
      is_active = ?
    WHERE id = ?
  `).run(
    email !== undefined ? email : user.email,
    full_name !== undefined ? full_name : user.full_name,
    role !== undefined ? role : user.role,
    is_active !== undefined ? (is_active ? 1 : 0) : user.is_active,
    id
  );

  logAudit('user', id, 'update', `Updated user settings for ${user.username}`, req.user.username);
  const updated = db.prepare('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?').get(id);
  res.json(updated);
});

// Delete or deactivate user
router.delete('/:id', verifyToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (req.user.id == id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
  logAudit('user', id, 'delete', `Deactivated user account id ${id}`, req.user.username);
  res.json({ success: true, message: 'User deactivated.' });
});

module.exports = router;
