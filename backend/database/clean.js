const { db } = require('./db');

function cleanRandomData() {
  console.log('Cleaning random data from database...');
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM bill_items').run();
  db.prepare('DELETE FROM bills').run();
  db.prepare('DELETE FROM customers').run();
  db.prepare('DELETE FROM items').run();
  db.prepare('DELETE FROM audit_logs').run();

  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('bills', 'bill_items', 'payments', 'customers', 'items', 'audit_logs')").run();
  } catch (e) {}

  db.prepare('UPDATE business_settings SET current_bill_no = 41, starting_bill_no = 41').run();
  console.log('Database successfully cleaned! 0 bills, 0 customers, 0 items, 0 payments.');
}

if (require.main === module) {
  cleanRandomData();
}

module.exports = { cleanRandomData };
