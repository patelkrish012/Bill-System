const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./db');

function seedDatabase() {
  initDatabase();

  // Check if users already exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    return;
  }

  console.log('Initializing system settings for Krish Agriculture...');

  // 1. Users
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const userHash = bcrypt.hashSync('Staff@123', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('admin', 'admin@krishagriculture.com', adminHash, 'Krish Admin', 'admin');
  insertUser.run('staff', 'staff@krishagriculture.com', userHash, 'Krish Billing Staff', 'user');

  // 2. Business Settings
  const insertSettings = db.prepare(`
    INSERT INTO business_settings (
      business_name, tagline, gstin, mobile, email, address, logo_path, starting_bill_no, current_bill_no
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSettings.run(
    'KRISH AGRICULTURE',
    'SALES | SERVICE | SPARE PARTS',
    '24AVCPP4549E1ZN',
    '94297 62695',
    'krishagriculturehmt@gmail.com',
    'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)',
    '/krish_logo.png',
    41,
    41
  );

  // 3. Bank Details
  const insertBank = db.prepare(`
    INSERT INTO bank_details (bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertBank.run(
    'State Bank of India',
    'KRISH AGRICULTURE',
    '412356789012',
    'SBIN0001234',
    'Himatnagar Branch',
    '9429762695@sbi',
    1
  );

  // 4. Terms & Conditions
  const insertTerm = db.prepare(`
    INSERT INTO terms_conditions (term_text, sort_order)
    VALUES (?, ?)
  `);

  const terms = [
    'Payment : 50% Advance with Purchase Order.',
    'Delivery : With 10-15 days',
    'Taxes : Inclusive of all the taxes.',
    'Quot : Validity 30 Days',
    'Payment Mode type cheque/dd..',
    'All Disputes Subject to Himatnagar Juridiction'
  ];

  terms.forEach((term, index) => {
    insertTerm.run(term, index + 1);
  });

  console.log('System initialized cleanly with 0 dummy bills/customers/items.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
