/**
 * Password Reset Script for KRISH AGRICULTURE
 * Run: node backend/reset-passwords.js
 * Resets admin → Admin@123 and staff → Staff@123
 */
const bcrypt = require('bcryptjs');
const path = require('path');

// Load database
process.env.DATABASE_DIR = process.env.DATABASE_DIR || path.join(__dirname, 'database');
const { db } = require('./database/db');

console.log('');
console.log('====================================================');
console.log('   KRISH AGRICULTURE - Password Reset Tool');
console.log('====================================================');

const salt = bcrypt.genSaltSync(10);

// Reset admin password
const adminHash = bcrypt.hashSync('Admin@123', salt);
const adminResult = db.prepare(`UPDATE users SET password_hash = ? WHERE username = 'admin'`).run(adminHash);

// Reset staff password  
const staffHash = bcrypt.hashSync('Staff@123', salt);
const staffResult = db.prepare(`UPDATE users SET password_hash = ? WHERE username = 'staff'`).run(staffHash);

if (adminResult.changes > 0) {
  console.log('✅ Admin password reset  → Admin@123');
} else {
  console.log('⚠️  Admin user not found!');
}

if (staffResult.changes > 0) {
  console.log('✅ Staff password reset  → Staff@123');
} else {
  console.log('⚠️  Staff user not found!');
}

// Show all users
const users = db.prepare('SELECT id, username, full_name, role, is_active FROM users').all();
console.log('');
console.log('Current Users:');
users.forEach(u => {
  console.log(`  [${u.id}] ${u.username} (${u.role}) - ${u.full_name} - Active: ${u.is_active}`);
});

console.log('');
console.log('====================================================');
console.log('   Passwords reset successfully!');
console.log('   Login: admin / Admin@123');
console.log('   Login: staff / Staff@123');
console.log('====================================================');
console.log('');

process.exit(0);
