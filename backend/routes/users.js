const express = require('express');
const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

router.get('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbAll('SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, password, and full name are required.' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) return res.status(400).json({ error: `Username '${username}' is already taken.` });

    const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    const result = await dbRun(
      `INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
      [username.trim(), email || '', hash, full_name.trim(), role]
    );

    logAudit('user', result.lastInsertRowid, 'create', `Created new user ${username} (${role})`, req.user.username);
    const created = await dbGet('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(created);
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, is_active, password } = req.body;

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (password) {
      const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
      await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    }

    await dbRun(
      `UPDATE users SET email=?, full_name=?, role=?, is_active=? WHERE id=?`,
      [
        email !== undefined ? email : user.email,
        full_name !== undefined ? full_name : user.full_name,
        role !== undefined ? role : user.role,
        is_active !== undefined ? (is_active ? 1 : 0) : user.is_active,
        id
      ]
    );

    logAudit('user', id, 'update', `Updated user settings for ${user.username}`, req.user.username);
    const updated = await dbGet('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id == id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    await dbRun('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
    logAudit('user', id, 'delete', `Deactivated user account id ${id}`, req.user.username);
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate user.' });
  }
});

module.exports = router;
