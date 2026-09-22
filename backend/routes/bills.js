const express = require('express');
const { db, dbAll, dbGet, dbRun } = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { logAudit } = require('../utils/auditLogger');
const { numberToIndianWords } = require('../utils/numberToWords');

const router = express.Router();

function formatBillNumber(num) {
  const n = parseInt(num, 10);
  if (isNaN(n)) return String(num);
  return n < 100 ? String(n).padStart(3, '0') : String(n);
}

router.get('/next-number', verifyToken, async (req, res) => {
  try {
    const settings = await dbGet('SELECT starting_bill_no, current_bill_no FROM business_settings ORDER BY id DESC LIMIT 1');
    const allBills = await dbAll('SELECT bill_number FROM bills');
    let maxNum = settings?.starting_bill_no ? settings.starting_bill_no - 1 : 40;
    allBills.forEach(b => {
      const parsed = parseInt(b.bill_number, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    });
    res.json({ next_bill_number: formatBillNumber(maxNum + 1), raw_number: maxNum + 1 });
  } catch (err) {
    console.error('Next bill number error:', err);
    res.status(500).json({ error: 'Failed to get next bill number.' });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, customer_id, payment_status, from_date, to_date, page = 1, limit = 20, sort_by = 'id', sort_order = 'DESC' } = req.query;

    let baseQuery = `FROM bills b LEFT JOIN customers c ON b.customer_id = c.id WHERE 1=1`;
    const params = [];

    if (search) {
      baseQuery += ` AND (b.bill_number LIKE ? OR b.customer_name LIKE ? OR b.customer_mobile LIKE ? OR b.customer_village LIKE ? OR b.id IN (SELECT bi.bill_id FROM bill_items bi WHERE bi.item_name LIKE ? OR bi.model LIKE ? OR bi.serial_no LIKE ? OR bi.unique_code LIKE ?))`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term, term, term, term);
    }
    if (customer_id) { baseQuery += ` AND b.customer_id = ?`; params.push(customer_id); }
    if (payment_status) { baseQuery += ` AND b.payment_status = ?`; params.push(payment_status); }
    if (from_date) { baseQuery += ` AND b.bill_date >= ?`; params.push(from_date); }
    if (to_date) { baseQuery += ` AND b.bill_date <= ?`; params.push(to_date); }

    const countRow = await dbGet(`SELECT COUNT(*) as total ${baseQuery}`, params);
    const totalRecords = Number(countRow?.total || 0);

    const validSorts = ['id', 'bill_number', 'bill_date', 'net_total', 'customer_name', 'payment_status'];
    const sortCol = validSorts.includes(sort_by) ? `b.${sort_by}` : 'b.id';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (Number(page) - 1) * Number(limit);

    const bills = await dbAll(
      `SELECT b.*, c.name as current_customer_name, c.mobile as current_customer_mobile ${baseQuery} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const enrichedBills = await Promise.all(bills.map(async b => ({
      ...b,
      items: await dbAll('SELECT item_name, model, qty, rate, total_amount FROM bill_items WHERE bill_id = ?', [b.id])
    })));

    res.json({ data: enrichedBills, pagination: { page: Number(page), limit: Number(limit), total: totalRecords, totalPages: Math.ceil(totalRecords / Number(limit)) } });
  } catch (err) {
    console.error('Bills list error:', err);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bill = await dbGet('SELECT * FROM bills WHERE id = ?', [req.params.id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });

    const items = await dbAll('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC', [bill.id]);
    const payments = await dbAll('SELECT * FROM payments WHERE bill_id = ? ORDER BY id ASC', [bill.id]);
    const logs = await dbAll(`SELECT * FROM audit_logs WHERE entity_type = 'bill' AND entity_id = ? ORDER BY id DESC`, [String(bill.id)]);

    let parsedBank = null;
    try { parsedBank = bill.bank_details_snap ? JSON.parse(bill.bank_details_snap) : null; } catch (e) {}
    let parsedTerms = [];
    try { parsedTerms = bill.terms_snap ? JSON.parse(bill.terms_snap) : []; } catch (e) {}

    res.json({ ...bill, items, payments, audit_history: logs, parsed_bank: parsedBank, parsed_terms: parsedTerms });
  } catch (err) {
    console.error('Bill get error:', err);
    res.status(500).json({ error: 'Failed to fetch bill.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      bill_number, bill_date, customer_id, customer_name, customer_address, customer_village,
      customer_taluka, customer_district, customer_state, customer_mobile, customer_gstin,
      tax_type = 'intra_state', items = [], discount_amount = 0, other_charges = 0,
      round_off = 0, payment_status = 'pending', paid_amount = 0, notes = '',
      payment_method, payment_ref
    } = req.body;

    if (!customer_name) return res.status(400).json({ error: 'Customer name is required.' });
    if (!bill_date) return res.status(400).json({ error: 'Bill date is required.' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required.' });

    let finalBillNo = bill_number ? formatBillNumber(bill_number) : null;
    if (!finalBillNo) {
      const allBills = await dbAll('SELECT bill_number FROM bills');
      let maxNum = 40;
      allBills.forEach(b => { const p = parseInt(b.bill_number, 10); if (!isNaN(p) && p > maxNum) maxNum = p; });
      finalBillNo = formatBillNumber(maxNum + 1);
    }

    const existingBill = await dbGet('SELECT id FROM bills WHERE bill_number = ?', [finalBillNo]);
    if (existingBill) return res.status(400).json({ error: `Bill number '${finalBillNo}' already exists.` });

    const settings = await dbGet('SELECT * FROM business_settings ORDER BY id DESC LIMIT 1');
    const defaultBank = await dbGet('SELECT * FROM bank_details WHERE is_active = 1 ORDER BY is_default DESC, id ASC LIMIT 1');
    const activeTerms = await dbAll('SELECT term_text FROM terms_conditions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');

    const bankSnapshot = defaultBank ? JSON.stringify({
      bank_name: defaultBank.bank_name, account_holder: defaultBank.account_holder,
      account_number: defaultBank.account_number, ifsc_code: defaultBank.ifsc_code,
      branch: defaultBank.branch, upi_id: defaultBank.upi_id
    }) : null;
    const termsSnapshot = JSON.stringify(activeTerms.map(t => t.term_text));

    let subtotal = 0, totalSGST = 0, totalCGST = 0, totalIGST = 0;
    const processedItems = items.map(item => {
      const qty = Number(item.qty) || 1;
      const rate = Number(item.rate) || 0;
      const itemSubtotal = qty * rate;
      subtotal += itemSubtotal;
      let sgstPct = 0, cgstPct = 0, igstPct = 0, sgstAmt = 0, cgstAmt = 0, igstAmt = 0;
      if (tax_type === 'intra_state') {
        sgstPct = item.sgst_pct !== undefined ? Number(item.sgst_pct) : 6;
        cgstPct = item.cgst_pct !== undefined ? Number(item.cgst_pct) : 6;
        sgstAmt = (itemSubtotal * sgstPct) / 100; cgstAmt = (itemSubtotal * cgstPct) / 100;
        totalSGST += sgstAmt; totalCGST += cgstAmt;
      } else {
        igstPct = item.igst_pct !== undefined ? Number(item.igst_pct) : 12;
        igstAmt = (itemSubtotal * igstPct) / 100; totalIGST += igstAmt;
      }
      return { ...item, qty, rate, sgst_pct: sgstPct, cgst_pct: cgstPct, igst_pct: igstPct, sgst_amount: sgstAmt, cgst_amount: cgstAmt, igst_amount: igstAmt, total_amount: itemSubtotal };
    });

    const disc = Number(discount_amount) || 0;
    const other = Number(other_charges) || 0;
    const roff = Number(round_off) || 0;
    const netTotal = Math.round((subtotal + totalSGST + totalCGST + totalIGST + other - disc + roff) * 100) / 100;
    const words = numberToIndianWords(netTotal);
    const initialPaid = Number(paid_amount) || 0;
    const remaining = Math.max(0, netTotal - initialPaid);
    const finalPaymentStatus = initialPaid >= netTotal ? 'paid' : initialPaid > 0 ? 'partial' : 'pending';

    let finalCustomerId = customer_id || null;
    if (!finalCustomerId && customer_name) {
      const existingCust = await dbGet('SELECT id FROM customers WHERE name = ? AND mobile = ?', [customer_name, customer_mobile || '']);
      if (existingCust) {
        finalCustomerId = existingCust.id;
      } else {
        const newCustResult = await dbRun(
          `INSERT INTO customers (name, address, village, taluka, district, state, mobile, gstin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [customer_name, customer_address || '', customer_village || '', customer_taluka || '', customer_district || '', customer_state || 'Gujarat', customer_mobile || '', customer_gstin ? customer_gstin.toUpperCase().trim() : '']
        );
        finalCustomerId = newCustResult.lastInsertRowid;
      }
    }

    const tx = await db.transaction('write');
    let newBillId;
    try {
      const billResult = await tx.execute({
        sql: `INSERT INTO bills (bill_number, bill_date, customer_id, customer_name, customer_address, customer_village, customer_taluka, customer_district, customer_state, customer_mobile, customer_gstin, tax_type, subtotal, sgst_amount, cgst_amount, igst_amount, discount_amount, other_charges, round_off, net_total, amount_in_words, payment_status, paid_amount, remaining_amount, business_name_snap, tagline_snap, gstin_snap, mobile_snap, email_snap, address_snap, logo_path_snap, bank_details_snap, terms_snap, notes, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [finalBillNo, bill_date, finalCustomerId, customer_name, customer_address || '', customer_village || '', customer_taluka || '', customer_district || '', customer_state || 'Gujarat', customer_mobile || '', customer_gstin ? customer_gstin.toUpperCase().trim() : '', tax_type, subtotal, totalSGST, totalCGST, totalIGST, disc, other, roff, netTotal, words, finalPaymentStatus, initialPaid, remaining, settings.business_name, settings.tagline, settings.gstin, settings.mobile, settings.email, settings.address, settings.logo_path, bankSnapshot, termsSnapshot, notes || '', req.user ? req.user.username : 'staff']
      });
      newBillId = Number(billResult.lastInsertRowid);

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
        await tx.execute({
          sql: `INSERT INTO bill_items (bill_id, item_id, item_name, model, capacity, serial_no, unique_code, mf_year, company, hsn_code, description_text, qty, rate, sgst_pct, cgst_pct, igst_pct, sgst_amount, cgst_amount, igst_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [newBillId, item.item_id || null, item.item_name || 'Item', item.model || '', item.capacity || '', item.serial_no || '', item.unique_code || '', item.mf_year || '', item.company || '', item.hsn_code || '', desc, item.qty, item.rate, item.sgst_pct, item.cgst_pct, item.igst_pct, item.sgst_amount, item.cgst_amount, item.igst_amount, item.total_amount]
        });
      }

      if (initialPaid > 0) {
        await tx.execute({
          sql: `INSERT INTO payments (bill_id, amount, payment_method, transaction_ref, payment_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [newBillId, initialPaid, payment_method || 'cash', payment_ref || '', bill_date, 'Initial payment upon bill creation', req.user ? req.user.username : 'staff']
        });
      }

      const currentNum = parseInt(finalBillNo, 10);
      if (!isNaN(currentNum)) {
        await tx.execute({ sql: 'UPDATE business_settings SET current_bill_no = ?', args: [currentNum] });
      }

      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    logAudit('bill', newBillId, 'create', `Created Bill No. ${finalBillNo} for ${customer_name}, Total: ₹${netTotal}`, req.user.username);
    const createdBill = await dbGet('SELECT * FROM bills WHERE id = ?', [newBillId]);
    res.status(201).json(createdBill);
  } catch (err) {
    console.error('Error creating bill:', err);
    res.status(500).json({ error: `Failed to create bill: ${err.message}` });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await dbGet('SELECT * FROM bills WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Bill not found.' });

    const {
      bill_number, bill_date, customer_id, customer_name, customer_address, customer_village,
      customer_taluka, customer_district, customer_state, customer_mobile, customer_gstin,
      tax_type = existing.tax_type, items = [], discount_amount = 0, other_charges = 0,
      round_off = 0, notes = ''
    } = req.body;

    if (!customer_name) return res.status(400).json({ error: 'Customer name is required.' });
    if (!bill_date) return res.status(400).json({ error: 'Bill date is required.' });
    if (!items || items.length === 0) return res.status(400).json({ error: 'At least one item is required.' });

    const newBillNo = bill_number ? formatBillNumber(bill_number) : existing.bill_number;
    if (newBillNo !== existing.bill_number) {
      const duplicate = await dbGet('SELECT id FROM bills WHERE bill_number = ? AND id != ?', [newBillNo, id]);
      if (duplicate) return res.status(400).json({ error: `Bill number '${newBillNo}' is already taken.` });
    }

    let subtotal = 0, totalSGST = 0, totalCGST = 0, totalIGST = 0;
    const processedItems = items.map(item => {
      const qty = Number(item.qty) || 1;
      const rate = Number(item.rate) || 0;
      const itemSubtotal = qty * rate;
      subtotal += itemSubtotal;
      let sgstPct = 0, cgstPct = 0, igstPct = 0, sgstAmt = 0, cgstAmt = 0, igstAmt = 0;
      if (tax_type === 'intra_state') {
        sgstPct = item.sgst_pct !== undefined ? Number(item.sgst_pct) : 6;
        cgstPct = item.cgst_pct !== undefined ? Number(item.cgst_pct) : 6;
        sgstAmt = (itemSubtotal * sgstPct) / 100; cgstAmt = (itemSubtotal * cgstPct) / 100;
        totalSGST += sgstAmt; totalCGST += cgstAmt;
      } else {
        igstPct = item.igst_pct !== undefined ? Number(item.igst_pct) : 12;
        igstAmt = (itemSubtotal * igstPct) / 100; totalIGST += igstAmt;
      }
      return { ...item, qty, rate, sgst_pct: sgstPct, cgst_pct: cgstPct, igst_pct: igstPct, sgst_amount: sgstAmt, cgst_amount: cgstAmt, igst_amount: igstAmt, total_amount: itemSubtotal };
    });

    const disc = Number(discount_amount) || 0;
    const other = Number(other_charges) || 0;
    const roff = Number(round_off) || 0;
    const netTotal = Math.round((subtotal + totalSGST + totalCGST + totalIGST + other - disc + roff) * 100) / 100;
    const words = numberToIndianWords(netTotal);

    const paidRow = await dbGet('SELECT COALESCE(SUM(amount), 0) as paid FROM payments WHERE bill_id = ?', [id]);
    const totalPaidSum = Number(paidRow?.paid || 0);
    const remaining = Math.max(0, netTotal - totalPaidSum);
    const finalPaymentStatus = totalPaidSum >= netTotal ? 'paid' : totalPaidSum > 0 ? 'partial' : 'pending';

    const tx = await db.transaction('write');
    try {
      await tx.execute({
        sql: `UPDATE bills SET bill_number=?, bill_date=?, customer_id=?, customer_name=?, customer_address=?, customer_village=?, customer_taluka=?, customer_district=?, customer_state=?, customer_mobile=?, customer_gstin=?, tax_type=?, subtotal=?, sgst_amount=?, cgst_amount=?, igst_amount=?, discount_amount=?, other_charges=?, round_off=?, net_total=?, amount_in_words=?, payment_status=?, paid_amount=?, remaining_amount=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        args: [newBillNo, bill_date, customer_id || existing.customer_id, customer_name, customer_address || '', customer_village || '', customer_taluka || '', customer_district || '', customer_state || 'Gujarat', customer_mobile || '', customer_gstin ? customer_gstin.toUpperCase().trim() : '', tax_type, subtotal, totalSGST, totalCGST, totalIGST, disc, other, roff, netTotal, words, finalPaymentStatus, totalPaidSum, remaining, notes || '', id]
      });

      await tx.execute({ sql: 'DELETE FROM bill_items WHERE bill_id = ?', args: [id] });

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
        await tx.execute({
          sql: `INSERT INTO bill_items (bill_id, item_id, item_name, model, capacity, serial_no, unique_code, mf_year, company, hsn_code, description_text, qty, rate, sgst_pct, cgst_pct, igst_pct, sgst_amount, cgst_amount, igst_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, item.item_id || null, item.item_name || 'Item', item.model || '', item.capacity || '', item.serial_no || '', item.unique_code || '', item.mf_year || '', item.company || '', item.hsn_code || '', desc, item.qty, item.rate, item.sgst_pct, item.cgst_pct, item.igst_pct, item.sgst_amount, item.cgst_amount, item.igst_amount, item.total_amount]
        });
      }
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    logAudit('bill', id, 'update', `Updated Bill No. ${newBillNo}, Net Total: ₹${netTotal}`, req.user.username);
    const updated = await dbGet('SELECT * FROM bills WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Error updating bill:', err);
    res.status(500).json({ error: `Failed to update bill: ${err.message}` });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await dbGet('SELECT bill_number, net_total FROM bills WHERE id = ?', [id]);
    if (!bill) return res.status(404).json({ error: 'Bill not found.' });
    await dbRun('DELETE FROM bills WHERE id = ?', [id]);
    logAudit('bill', id, 'delete', `Deleted Bill No. ${bill.bill_number} (Amount: ₹${bill.net_total})`, req.user.username);
    res.json({ success: true, message: `Bill No. ${bill.bill_number} deleted successfully.` });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

module.exports = router;
