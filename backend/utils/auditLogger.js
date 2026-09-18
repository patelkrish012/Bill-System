const { db } = require('../database/db');

function logAudit(entity_type, entity_id, action, details, username = 'system') {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, details, username)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      entity_type,
      String(entity_id || ''),
      action,
      typeof details === 'object' ? JSON.stringify(details) : String(details),
      username
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
