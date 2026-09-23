const jwt = require('jsonwebtoken');
const { dbGet } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'krish-agri-secret-token-2026-secure-key';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbGet('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?', [decoded.id]);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User is inactive or no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireAdmin
};
