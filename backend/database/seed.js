const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun, initDatabase } = require('./db');

async function seedDatabase() {
  await initDatabase();

  // Strip leading zeros from any existing bills (e.g. '068' -> '68')
  try {
    const zeroBills = await dbAll("SELECT id, bill_number FROM bills WHERE bill_number LIKE '0%'");
    for (const b of zeroBills) {
      const stripped = b.bill_number.replace(/^0+(?=\d)/, '');
      await dbRun("UPDATE bills SET bill_number = ? WHERE id = ?", [stripped, b.id]);
    }
  } catch (e) {
    console.warn('Could not clean leading zero bills:', e.message);
  }

  const userRow = await dbGet('SELECT COUNT(*) as count FROM users');
  const userCount = userRow ? Number(userRow.count) : 0;
  if (userCount > 0) return;

  console.log('Initializing system settings for Krish Agriculture...');

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const userHash = bcrypt.hashSync('Staff@123', salt);

  await dbRun(
    `INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
    ['admin', 'admin@krishagriculture.com', adminHash, 'Krish Admin', 'admin']
  );
  await dbRun(
    `INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
    ['staff', 'staff@krishagriculture.com', userHash, 'Krish Billing Staff', 'user']
  );

  await dbRun(
    `INSERT INTO business_settings (business_name, tagline, gstin, mobile, email, address, logo_path, starting_bill_no, current_bill_no)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'KRISH AGRICULTURE',
      'SALES | SERVICE | SPARE PARTS',
      '24AVCPP4549E1ZN',
      '94297 62695',
      'krishagriculturehmt@gmail.com',
      'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)',
      '/krish_logo.png',
      41,
      41
    ]
  );

  await dbRun(
    `INSERT INTO bank_details (bank_name, account_holder, account_number, ifsc_code, branch, upi_id, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['State Bank of India', 'KRISH AGRICULTURE', '412356789012', 'SBIN0001234', 'Himatnagar Branch', '9429762695@sbi', 1]
  );

  const terms = [
    'Payment : 50% Advance with Purchase Order.',
    'Delivery : With 10-15 days',
    'Taxes : Inclusive of all the taxes.',
    'Quot : Validity 30 Days',
    'Payment Mode type cheque/dd..',
    'All Disputes Subject to Himatnagar Juridiction'
  ];
  for (let i = 0; i < terms.length; i++) {
    await dbRun(`INSERT INTO terms_conditions (term_text, sort_order) VALUES (?, ?)`, [terms[i], i + 1]);
  }

  console.log('System initialized cleanly.');
}

module.exports = { seedDatabase };
