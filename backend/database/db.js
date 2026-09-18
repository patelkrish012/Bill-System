const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'krish_agriculture.db');
const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance & reliability
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS business_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_name TEXT NOT NULL DEFAULT 'KRISH AGRICULTURE',
      tagline TEXT NOT NULL DEFAULT 'SALES | SERVICE | SPARE PARTS',
      gstin TEXT NOT NULL DEFAULT '24AVCPP4549E1ZN',
      mobile TEXT NOT NULL DEFAULT '94297 62695',
      email TEXT NOT NULL DEFAULT 'krishagriculturehmt@gmail.com',
      address TEXT NOT NULL DEFAULT 'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)',
      logo_path TEXT DEFAULT '/krish_logo.png',
      starting_bill_no INTEGER DEFAULT 41,
      current_bill_no INTEGER DEFAULT 41,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bank_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_holder TEXT NOT NULL,
      account_number TEXT NOT NULL,
      ifsc_code TEXT NOT NULL,
      branch TEXT,
      upi_id TEXT,
      is_default INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS terms_conditions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      term_text TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      village TEXT,
      taluka TEXT,
      district TEXT,
      state TEXT DEFAULT 'Gujarat',
      mobile TEXT,
      gstin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      capacity TEXT,
      serial_no TEXT,
      unique_code TEXT,
      mf_year TEXT,
      company TEXT,
      rate REAL NOT NULL DEFAULT 0,
      sgst_pct REAL DEFAULT 6,
      cgst_pct REAL DEFAULT 6,
      igst_pct REAL DEFAULT 12,
      hsn_code TEXT,
      description TEXT,
      stock_qty INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT UNIQUE NOT NULL,
      bill_date TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_address TEXT,
      customer_village TEXT,
      customer_taluka TEXT,
      customer_district TEXT,
      customer_state TEXT DEFAULT 'Gujarat',
      customer_mobile TEXT,
      customer_gstin TEXT,
      tax_type TEXT DEFAULT 'intra_state', -- 'intra_state' (SGST+CGST) or 'inter_state' (IGST)
      subtotal REAL NOT NULL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      other_charges REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      net_total REAL NOT NULL DEFAULT 0,
      amount_in_words TEXT NOT NULL,
      payment_status TEXT DEFAULT 'pending', -- 'paid', 'partial', 'pending'
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      business_name_snap TEXT NOT NULL,
      tagline_snap TEXT NOT NULL,
      gstin_snap TEXT NOT NULL,
      mobile_snap TEXT NOT NULL,
      email_snap TEXT NOT NULL,
      address_snap TEXT NOT NULL,
      logo_path_snap TEXT,
      bank_details_snap TEXT, -- JSON string
      terms_snap TEXT,        -- JSON string
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      model TEXT,
      capacity TEXT,
      serial_no TEXT,
      unique_code TEXT,
      mf_year TEXT,
      company TEXT,
      hsn_code TEXT,
      description_text TEXT,
      qty REAL NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      sgst_pct REAL DEFAULT 0,
      cgst_pct REAL DEFAULT 0,
      igst_pct REAL DEFAULT 0,
      sgst_amount REAL DEFAULT 0,
      cgst_amount REAL DEFAULT 0,
      igst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash', -- 'cash', 'upi', 'cheque', 'bank_transfer', 'other'
      transaction_ref TEXT,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL, -- 'bill', 'customer', 'item', 'settings', 'user', 'payment'
      entity_id TEXT,
      action TEXT NOT NULL,      -- 'create', 'update', 'delete', 'login'
      details TEXT,
      username TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);
    CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
    CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
    CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
    CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
  `);
}

module.exports = { db, initDatabase };
