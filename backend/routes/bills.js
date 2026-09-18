const express = require('express');
const { db } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { numberToIndianWords } = require('../utils/numberToWords');

const router = express.Router();

// Helper to format bill number (pads to 3 digits minimum, e.g., '041')
function formatBillNumber(num) {
  const n = parseInt(num, 10);
  if (isNaN(n)) return String(num);
  return n < 100 ? String(n).padStart(3, '0') : String(n);
}

// Get next sequential bill number
router.get('/next-number', verifyToken, (req, res) => {
  const settings = db.prepare('SELECT starting_bill_no, current_bill_no FROM business_settings ORDER BY id DESC LIMIT 1').get();
  
  // Find highest numeric bill number in DB
  const allBills = db.prepare('SELECT bill_number FROM bills').all();
  let maxNum = settings?.starting_bill_no ? settings.starting_bill_no - 1 : 40;

  allBills.forEach(b => {
    const parsed = parseInt(b.bill_number, 10);
    if (!isNaN(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  });

  const nextNum = maxNum + 1;
  res.json({
    next_bill_number: formatBillNumber(nextNum),
    raw_number: nextNum
  });
});

// List all bills with comprehensive search & filtering
router.get('/', verifyToken, (req, res) => {
  const {
    search,
    customer_id,
    payment_status,
    from_date,
    to_date,
    page = 1,
    limit = 20,
    sort_by = 'id',
    sort_order = 'DESC'
  } = req.query;

  let baseQuery = `
    FROM bills b
    LEFT JOIN customers c ON b.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    baseQuery += ` AND (
      b.bill_number LIKE ? OR
      b.customer_name LIKE ? OR
      b.customer_mobile LIKE ? OR
      b.customer_village LIKE ? OR
      b.id IN (
        SELECT bi.bill_id FROM bill_items bi 
        WHERE bi.item_name LIKE ? OR bi.model LIKE ? OR bi.serial_no LIKE ? OR bi.unique_code LIKE ?
      )
    )`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term, term, term, term);
  }

  if (customer_id) {
    baseQuery += ` AND b.customer_id = ?`;
    params.push(customer_id);
  }

  if (payment_status) {
    baseQuery += ` AND b.payment_status = ?`;
    params.push(payment_status);
  }

  if (from_date) {
    baseQuery += ` AND b.bill_date >= ?`;
    params.push(from_date);
  }

  if (to_date) {
    baseQuery += ` AND b.bill_date <= ?`;
    params.push(to_date);
  }

  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
  const totalRecords = db.prepare(countQuery).get(...params).total;

  const validSorts = ['id', 'bill_number', 'bill_date', 'net_total', 'customer_name', 'payment_status'];
  const sortCol = validSorts.includes(sort_by) ? `b.${sort_by}` : 'b.id';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const offset = (Number(page) - 1) * Number(limit);
  const dataQuery = `
    SELECT 
      b.*,
      c.name as current_customer_name,
      c.mobile as current_customer_mobile
    ${baseQuery}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const bills = db.prepare(dataQuery).all(...params, Number(limit), offset);

  // Attach items snippet
  const billItemStmt = db.prepare('SELECT item_name, model, qty, rate, total_amount FROM bill_items WHERE bill_id = ?');
  const enrichedBills = bills.map(b => ({
    ...b,
    items: billItemStmt.all(b.id)
  }));

  res.json({
    data: enrichedBills,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: totalRecords,
      totalPages: Math.ceil(totalRecords / Number(limit))
    }
  });
});

// Single Bill by ID with items, payments, and audit history
router.get('/:id', verifyToken, (req, res) => {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  const items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC').all(bill.id);
  const payments = db.prepare('SELECT * FROM payments WHERE bill_id = ? ORDER BY id ASC').all(bill.id);
  const logs = db.prepare("SELECT * FROM audit_logs WHERE entity_type = 'bill' AND entity_id = ? ORDER BY id DESC").all(String(bill.id));

  let parsedBank = null;
  try {
    parsedBank = bill.bank_details_snap ? JSON.parse(bill.bank_details_snap) : null;
  } catch (e) {}

  let parsedTerms = [];
  try {
    parsedTerms = bill.terms_snap ? JSON.parse(bill.terms_snap) : [];
  } catch (e) {}

  res.json({
    ...bill,
    items,
    payments,
    audit_history: logs,
    parsed_bank: parsedBank,
    parsed_terms: parsedTerms
  });
});

// Create new Bill with transaction & immutable business snapshot
router.post('/', verifyToken, (req, res) => {
  const {
    bill_number,
    bill_date,
    customer_id,
    customer_name,
    customer_address,
    customer_village,
    customer_taluka,
    customer_district,
    customer_state,
    customer_mobile,
    customer_gstin,
    tax_type = 'intra_state', // 'intra_state' or 'inter_state'
    items = [],
    discount_amount = 0,
    other_charges = 0,
    round_off = 0,
    payment_status = 'pending',
    paid_amount = 0,
    notes = '',
    payment_method,
    payment_ref
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }
  if (!bill_date) {
    return res.status(400).json({ error: 'Bill date is required.' });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required on the bill.' });
  }

  // 1. Resolve Bill Number
  let finalBillNo = bill_number ? formatBillNumber(bill_number) : null;
  if (!finalBillNo) {
    const allBills = db.prepare('SELECT bill_number FROM bills').all();
    let maxNum = 40;
    allBills.forEach(b => {
      const p = parseInt(b.bill_number, 10);
      if (!isNaN(p) && p > maxNum) maxNum = p;
    });
    finalBillNo = formatBillNumber(maxNum + 1);
  }

  // Check unique bill number
  const existingBill = db.prepare('SELECT id FROM bills WHERE bill_number = ?').get(finalBillNo);
  if (existingBill) {
    return res.status(400).json({ error: `Bill number '${finalBillNo}' already exists. Please choose a unique bill number.` });
  }

  // 2. Fetch current business settings, bank details, and terms for immutable snapshot
  const settings = db.prepare('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1').get();
  const defaultBank = db.prepare('SELECT * FROM bank_details WHERE is_active = 1 ORDER BY is_default DESC, id ASC LIMIT 1').get();
  const activeTerms = db.prepare('SELECT term_text FROM terms_conditions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all();

  const bankSnapshot = defaultBank ? JSON.stringify({
    bank_name: defaultBank.bank_name,
    account_holder: defaultBank.account_holder,
    account_number: defaultBank.account_number,
    ifsc_code: defaultBank.ifsc_code,
    branch: defaultBank.branch,
    upi_id: defaultBank.upi_id
  }) : null;

  const termsSnapshot = JSON.stringify(activeTerms.map(t => t.term_text));

  // 3. Compute Totals accurately
  let subtotal = 0;
  let totalSGST = 0;
  let totalCGST = 0;
  let totalIGST = 0;

  const processedItems = items.map(item => {
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const itemSubtotal = qty * rate;
    subtotal += itemSubtotal;

    let sgstPct = 0;
    let cgstPct = 0;
    let igstPct = 0;
    let sgstAmt = 0;
    let cgstAmt = 0;
    let igstAmt = 0;

    if (tax_type === 'intra_state') {
      sgstPct = item.sgst_pct !== undefined ? Number(item.sgst_pct) : 6;
      cgstPct = item.cgst_pct !== undefined ? Number(item.cgst_pct) : 6;
      sgstAmt = (itemSubtotal * sgstPct) / 100;
      cgstAmt = (itemSubtotal * cgstPct) / 100;
      totalSGST += sgstAmt;
      totalCGST += cgstAmt;
    } else {
      igstPct = item.igst_pct !== undefined ? Number(item.igst_pct) : 12;
      igstAmt = (itemSubtotal * igstPct) / 100;
      totalIGST += igstAmt;
    }

    return {
      ...item,
      qty,
      rate,
      sgst_pct: sgstPct,
      cgst_pct: cgstPct,
      igst_pct: igstPct,
      sgst_amount: sgstAmt,
      cgst_amount: cgstAmt,
      igst_amount: igstAmt,
      total_amount: itemSubtotal
    };
  });

  const disc = Number(discount_amount) || 0;
  const other = Number(other_charges) || 0;
  const roff = Number(round_off) || 0;

  const netTotal = Math.round((subtotal + totalSGST + totalCGST + totalIGST + other - disc + roff) * 100) / 100;
  const words = numberToIndianWords(netTotal);

  const initialPaid = Number(paid_amount) || 0;
  const remaining = Math.max(0, netTotal - initialPaid);

  let finalPaymentStatus = payment_status;
  if (initialPaid >= netTotal) {
    finalPaymentStatus = 'paid';
  } else if (initialPaid > 0) {
    finalPaymentStatus = 'partial';
  } else {
    finalPaymentStatus = 'pending';
  }

  // 4. Save Customer if customer_id not supplied but new name entered
  let finalCustomerId = customer_id || null;
  if (!finalCustomerId && customer_name) {
    const existingCust = db.prepare('SELECT id FROM customers WHERE name = ? AND mobile = ?').get(customer_name, customer_mobile || '');
    if (existingCust) {
      finalCustomerId = existingCust.id;
    } else {
      const newCustResult = db.prepare(`
        INSERT INTO customers (name, address, village, taluka, district, state, mobile, gstin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        customer_name,
        customer_address || '',
        customer_village || '',
        customer_taluka || '',
        customer_district || '',
        customer_state || 'Gujarat',
        customer_mobile || '',
        customer_gstin ? customer_gstin.toUpperCase().trim() : ''
      );
      finalCustomerId = newCustResult.lastInsertRowid;
    }
  }

  // 5. Execute in SQLite Transaction
  const executeTransaction = db.transaction(() => {
    const insertBillStmt = db.prepare(`
      INSERT INTO bills (
        bill_number, bill_date, customer_id,
        customer_name, customer_address, customer_village, customer_taluka, customer_district, customer_state, customer_mobile, customer_gstin,
        tax_type, subtotal, sgst_amount, cgst_amount, igst_amount, discount_amount, other_charges, round_off, net_total,
        amount_in_words, payment_status, paid_amount, remaining_amount,
        business_name_snap, tagline_snap, gstin_snap, mobile_snap, email_snap, address_snap, logo_path_snap,
        bank_details_snap, terms_snap, notes, created_by
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const billResult = insertBillStmt.run(
      finalBillNo,
      bill_date,
      finalCustomerId,
      customer_name,
      customer_address || '',
      customer_village || '',
      customer_taluka || '',
      customer_district || '',
      customer_state || 'Gujarat',
      customer_mobile || '',
      customer_gstin ? customer_gstin.toUpperCase().trim() : '',
      tax_type,
      subtotal,
      totalSGST,
      totalCGST,
      totalIGST,
      disc,
      other,
      roff,
      netTotal,
      words,
      finalPaymentStatus,
      initialPaid,
      remaining,
      settings.business_name,
      settings.tagline,
      settings.gstin, // ALWAYS business GSTIN 24AVCPP4549E1ZN
      settings.mobile,
      settings.email,
      settings.address,
      settings.logo_path,
      bankSnapshot,
      termsSnapshot,
      notes || '',
      req.user ? req.user.username : 'staff'
    );

    const newBillId = billResult.lastInsertRowid;

    // Insert Items
    const insertItemStmt = db.prepare(`
      INSERT INTO bill_items (
        bill_id, item_id, item_name, model, capacity, serial_no, unique_code, mf_year, company, hsn_code,
        description_text, qty, rate, sgst_pct, cgst_pct, igst_pct, sgst_amount, cgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      let desc = item.description_text || '';
      if (!desc) {
        const lines = [];
        if (item.model) lines.push(`Model: ${item.model}`);
        if (item.capacity) lines.push(`Capacity: ${item.capacity}`);
        if (item.serial_no) lines.push(`S.R. No.: ${item.serial_no}`);
        if (item.unique_code) lines.push(`Unique Code: ${item.unique_code}`);
        if (item.mf_year) lines.push(`MF Year: ${item.mf_year}`);
        if (item.company) lines.push(`Company: ${item.company}`);
        if (item.hsn_code) lines.push(`HSN: ${item.hsn_code}`);
        desc = lines.join('\n');
      }

      insertItemStmt.run(
        newBillId,
        item.item_id || null,
        item.item_name || 'Item',
        item.model || '',
        item.capacity || '',
        item.serial_no || '',
        item.unique_code || '',
        item.mf_year || '',
        item.company || '',
        item.hsn_code || '',
        desc,
        item.qty,
        item.rate,
        item.sgst_pct,
        item.cgst_pct,
        item.igst_pct,
        item.sgst_amount,
        item.cgst_amount,
        item.igst_amount,
        item.total_amount
      );
    }

    // Insert Payment if initial payment made
    if (initialPaid > 0) {
      db.prepare(`
        INSERT INTO payments (bill_id, amount, payment_method, transaction_ref, payment_date, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        newBillId,
        initialPaid,
        payment_method || 'cash',
        payment_ref || '',
        bill_date,
        'Initial payment upon bill creation',
        req.user ? req.user.username : 'staff'
      );
    }

    // Advance current bill number if numeric
    const currentNum = parseInt(finalBillNo, 10);
    if (!isNaN(currentNum)) {
      db.prepare('UPDATE business_settings SET current_bill_no = ?').run(currentNum);
    }

    return newBillId;
  });

  try {
    const createdId = executeTransaction();
    logAudit('bill', createdId, 'create', `Created Bill No. ${finalBillNo} for ${customer_name}, Total: ₹${netTotal}`, req.user.username);
    
    const createdBill = db.prepare('SELECT * FROM bills WHERE id = ?').get(createdId);
    res.status(201).json(createdBill);
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(500).json({ error: `Failed to create bill: ${err.message}` });
  }
});

// Update Existing Bill
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);

  if (!existing) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  const {
    bill_number,
    bill_date,
    customer_id,
    customer_name,
    customer_address,
    customer_village,
    customer_taluka,
    customer_district,
    customer_state,
    customer_mobile,
    customer_gstin,
    tax_type = existing.tax_type,
    items = [],
    discount_amount = 0,
    other_charges = 0,
    round_off = 0,
    notes = ''
  } = req.body;

  if (!customer_name) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }
  if (!bill_date) {
    return res.status(400).json({ error: 'Bill date is required.' });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required on the bill.' });
  }

  // Check unique bill number if changed
  const newBillNo = bill_number ? formatBillNumber(bill_number) : existing.bill_number;
  if (newBillNo !== existing.bill_number) {
    const duplicate = db.prepare('SELECT id FROM bills WHERE bill_number = ? AND id != ?').get(newBillNo, id);
    if (duplicate) {
      return res.status(400).json({ error: `Bill number '${newBillNo}' is already taken.` });
    }
  }

  // Recalculate totals
  let subtotal = 0;
  let totalSGST = 0;
  let totalCGST = 0;
  let totalIGST = 0;

  const processedItems = items.map(item => {
    const qty = Number(item.qty) || 1;
    const rate = Number(item.rate) || 0;
    const itemSubtotal = qty * rate;
    subtotal += itemSubtotal;

    let sgstPct = 0;
    let cgstPct = 0;
    let igstPct = 0;
    let sgstAmt = 0;
    let cgstAmt = 0;
    let igstAmt = 0;

    if (tax_type === 'intra_state') {
      sgstPct = item.sgst_pct !== undefined ? Number(item.sgst_pct) : 6;
      cgstPct = item.cgst_pct !== undefined ? Number(item.cgst_pct) : 6;
      sgstAmt = (itemSubtotal * sgstPct) / 100;
      cgstAmt = (itemSubtotal * cgstPct) / 100;
      totalSGST += sgstAmt;
      totalCGST += cgstAmt;
    } else {
      igstPct = item.igst_pct !== undefined ? Number(item.igst_pct) : 12;
      igstAmt = (itemSubtotal * igstPct) / 100;
      totalIGST += igstAmt;
    }

    return {
      ...item,
      qty,
      rate,
      sgst_pct: sgstPct,
      cgst_pct: cgstPct,
      igst_pct: igstPct,
      sgst_amount: sgstAmt,
      cgst_amount: cgstAmt,
      igst_amount: igstAmt,
      total_amount: itemSubtotal
    };
  });

  const disc = Number(discount_amount) || 0;
  const other = Number(other_charges) || 0;
  const roff = Number(round_off) || 0;

  const netTotal = Math.round((subtotal + totalSGST + totalCGST + totalIGST + other - disc + roff) * 100) / 100;
  const words = numberToIndianWords(netTotal);

  // Recalculate remaining amount from existing payments
  const totalPaidSum = db.prepare('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE bill_id = ?').get(id).paid;
  const remaining = Math.max(0, netTotal - totalPaidSum);

  let finalPaymentStatus = 'pending';
  if (totalPaidSum >= netTotal) {
    finalPaymentStatus = 'paid';
  } else if (totalPaidSum > 0) {
    finalPaymentStatus = 'partial';
  }

  const updateTransaction = db.transaction(() => {
    db.prepare(`
      UPDATE bills SET
        bill_number = ?,
        bill_date = ?,
        customer_id = ?,
        customer_name = ?,
        customer_address = ?,
        customer_village = ?,
        customer_taluka = ?,
        customer_district = ?,
        customer_state = ?,
        customer_mobile = ?,
        customer_gstin = ?,
        tax_type = ?,
        subtotal = ?,
        sgst_amount = ?,
        cgst_amount = ?,
        igst_amount = ?,
        discount_amount = ?,
        other_charges = ?,
        round_off = ?,
        net_total = ?,
        amount_in_words = ?,
        payment_status = ?,
        paid_amount = ?,
        remaining_amount = ?,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      newBillNo,
      bill_date,
      customer_id || existing.customer_id,
      customer_name,
      customer_address || '',
      customer_village || '',
      customer_taluka || '',
      customer_district || '',
      customer_state || 'Gujarat',
      customer_mobile || '',
      customer_gstin ? customer_gstin.toUpperCase().trim() : '',
      tax_type,
      subtotal,
      totalSGST,
      totalCGST,
      totalIGST,
      disc,
      other,
      roff,
      netTotal,
      words,
      finalPaymentStatus,
      totalPaidSum,
      remaining,
      notes || '',
      id
    );

    // Delete old items and insert updated items
    db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(id);

    const insertItemStmt = db.prepare(`
      INSERT INTO bill_items (
        bill_id, item_id, item_name, model, capacity, serial_no, unique_code, mf_year, company, hsn_code,
        description_text, qty, rate, sgst_pct, cgst_pct, igst_pct, sgst_amount, cgst_amount, igst_amount, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      let desc = item.description_text || '';
      if (!desc) {
        const lines = [];
        if (item.model) lines.push(`Model: ${item.model}`);
        if (item.capacity) lines.push(`Capacity: ${item.capacity}`);
        if (item.serial_no) lines.push(`S.R. No.: ${item.serial_no}`);
        if (item.unique_code) lines.push(`Unique Code: ${item.unique_code}`);
        if (item.mf_year) lines.push(`MF Year: ${item.mf_year}`);
        if (item.company) lines.push(`Company: ${item.company}`);
        if (item.hsn_code) lines.push(`HSN: ${item.hsn_code}`);
        desc = lines.join('\n');
      }

      insertItemStmt.run(
        id,
        item.item_id || null,
        item.item_name || 'Item',
        item.model || '',
        item.capacity || '',
        item.serial_no || '',
        item.unique_code || '',
        item.mf_year || '',
        item.company || '',
        item.hsn_code || '',
        desc,
        item.qty,
        item.rate,
        item.sgst_pct,
        item.cgst_pct,
        item.igst_pct,
        item.sgst_amount,
        item.cgst_amount,
        item.igst_amount,
        item.total_amount
      );
    }
  });

  try {
    updateTransaction();
    logAudit('bill', id, 'update', `Updated Bill No. ${newBillNo}, Net Total: ₹${netTotal}`, req.user.username);
    const updated = db.prepare('SELECT * FROM bills WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(500).json({ error: `Failed to update bill: ${err.message}` });
  }
});

// Delete Bill
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const bill = db.prepare('SELECT bill_number, net_total FROM bills WHERE id = ?').get(id);

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found.' });
  }

  db.prepare('DELETE FROM bills WHERE id = ?').run(id);
  logAudit('bill', id, 'delete', `Deleted Bill No. ${bill.bill_number} (Amount: ₹${bill.net_total})`, req.user.username);

  res.json({ success: true, message: `Bill No. ${bill.bill_number} deleted successfully.` });
});

module.exports = router;
