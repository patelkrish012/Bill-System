const express = require('express');
const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../database/db');
const { generateToken, verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await dbGet(
      `SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1`,
      [username.trim(), username.trim()]
    );

    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid username or password.' });

    const token = generateToken(user);
    logAudit('user', user.id, 'login', `User ${user.username} logged in successfully`, user.username);

    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Current User Profile
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Change Password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const newHash = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    logAudit('user', req.user.id, 'update', 'User changed password', req.user.username);
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
