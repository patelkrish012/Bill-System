const express = require('express');
const { dbAll, dbGet } = require('../database/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonthStr = String(new Date().getMonth() + 1).padStart(2, '0');

    const allBills = await dbAll('SELECT * FROM bills');
    const custRow = await dbGet('SELECT COUNT(*) as count FROM customers');
    const itemRow = await dbGet('SELECT COUNT(*) as count FROM items');
    const totalCustomers = Number(custRow?.count || 0);
    const totalItems = Number(itemRow?.count || 0);

    let todaySales = 0, thisMonthSales = 0, thisYearSales = 0, totalSales = 0, totalPaid = 0, totalPending = 0;
    const monthMap = {};
    for (let i = 1; i <= 12; i++) monthMap[i] = 0;
    const paymentStatusMap = { paid: 0, partial: 0, pending: 0 };

    allBills.forEach(b => {
      totalSales += b.net_total;
      totalPaid += b.paid_amount || 0;
      totalPending += b.remaining_amount || 0;
      paymentStatusMap[b.payment_status] = (paymentStatusMap[b.payment_status] || 0) + 1;

      let dYear, dMonth;
      if (b.bill_date && b.bill_date.includes('/')) {
        const parts = b.bill_date.split('/');
        dMonth = parts[1]; dYear = parts[2];
      } else if (b.bill_date && b.bill_date.includes('-')) {
        const parts = b.bill_date.split('-');
        dYear = parts[0]; dMonth = parts[1];
      }
      if (dYear == currentYear) {
        thisYearSales += b.net_total;
        const mIdx = parseInt(dMonth, 10);
        if (monthMap[mIdx] !== undefined) monthMap[mIdx] += b.net_total;
        if (dMonth == currentMonthStr) thisMonthSales += b.net_total;
      }
    });

    const recentBills = await dbAll(`SELECT id, bill_number, bill_date, customer_name, net_total, payment_status, paid_amount, remaining_amount FROM bills ORDER BY id DESC LIMIT 6`);
    const topProducts = await dbAll(`SELECT item_name, model, SUM(qty) as total_qty, SUM(total_amount) as total_revenue FROM bill_items GROUP BY item_name, model ORDER BY total_revenue DESC LIMIT 5`);

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthlyChart = monthNames.map((name, i) => ({ month: name, sales: monthMap[i + 1] || 0 }));

    res.json({
      today_sales: todaySales, this_month_sales: thisMonthSales, this_year_sales: thisYearSales,
      total_sales: totalSales, total_bills: allBills.length, total_customers: totalCustomers,
      total_items: totalItems, total_paid: totalPaid, total_pending: totalPending,
      recent_bills: recentBills, top_products: topProducts, monthly_chart: monthlyChart,
      payment_status_summary: paymentStatusMap
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data.' });
  }
});

router.get('/monthly', verifyToken, async (req, res) => {
  try {
    const { month, year } = req.query;
    const selMonth = String(month || new Date().getMonth() + 1).padStart(2, '0');
    const selYear = String(year || new Date().getFullYear());

    const allBills = await dbAll('SELECT * FROM bills');
    const matchedBills = allBills.filter(b => {
      let dYear, dMonth;
      if (b.bill_date?.includes('/')) { const p = b.bill_date.split('/'); dMonth = p[1]; dYear = p[2]; }
      else if (b.bill_date?.includes('-')) { const p = b.bill_date.split('-'); dYear = p[0]; dMonth = p[1]; }
      return dYear == selYear && dMonth == selMonth;
    });

    let totalSales = 0, totalSGST = 0, totalCGST = 0, totalIGST = 0, totalPaid = 0, totalPending = 0;
    matchedBills.forEach(b => {
      totalSales += b.net_total; totalSGST += b.sgst_amount || 0; totalCGST += b.cgst_amount || 0;
      totalIGST += b.igst_amount || 0; totalPaid += b.paid_amount || 0; totalPending += b.remaining_amount || 0;
    });

    let itemsSummary = [], totalQty = 0;
    const billIds = matchedBills.map(b => b.id);
    if (billIds.length > 0) {
      const placeholders = billIds.map(() => '?').join(',');
      itemsSummary = await dbAll(
        `SELECT item_name, model, company, SUM(qty) as total_qty, SUM(total_amount) as total_sales FROM bill_items WHERE bill_id IN (${placeholders}) GROUP BY item_name, model ORDER BY total_sales DESC`,
        billIds
      );
      totalQty = itemsSummary.reduce((acc, curr) => acc + Number(curr.total_qty || 0), 0);
    }

    res.json({ month: selMonth, year: selYear, total_bills: matchedBills.length, total_sales: totalSales,
      total_gst: totalSGST + totalCGST + totalIGST, sgst_amount: totalSGST, cgst_amount: totalCGST,
      igst_amount: totalIGST, total_qty: totalQty, total_paid: totalPaid, total_pending: totalPending,
      bills: matchedBills, items: itemsSummary });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly report.' });
  }
});

router.get('/yearly', verifyToken, async (req, res) => {
  try {
    const selYear = String(req.query.year || new Date().getFullYear());
    const allBills = await dbAll('SELECT * FROM bills');
    const matchedBills = allBills.filter(b => {
      let dYear;
      if (b.bill_date?.includes('/')) dYear = b.bill_date.split('/')[2];
      else if (b.bill_date?.includes('-')) dYear = b.bill_date.split('-')[0];
      return dYear == selYear;
    });

    let totalSales = 0, totalGST = 0, totalPaid = 0, totalPending = 0;
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthMap = {};
    monthNames.forEach((name, i) => { monthMap[i + 1] = { name, month: i + 1, bills: 0, sales: 0, gst: 0, paid: 0, pending: 0 }; });

    matchedBills.forEach(b => {
      totalSales += b.net_total;
      const gstSum = (b.sgst_amount || 0) + (b.cgst_amount || 0) + (b.igst_amount || 0);
      totalGST += gstSum; totalPaid += b.paid_amount || 0; totalPending += b.remaining_amount || 0;
      let mIdx;
      if (b.bill_date?.includes('/')) mIdx = parseInt(b.bill_date.split('/')[1], 10);
      else if (b.bill_date?.includes('-')) mIdx = parseInt(b.bill_date.split('-')[1], 10);
      if (monthMap[mIdx]) { monthMap[mIdx].bills += 1; monthMap[mIdx].sales += b.net_total; monthMap[mIdx].gst += gstSum; monthMap[mIdx].paid += b.paid_amount || 0; monthMap[mIdx].pending += b.remaining_amount || 0; }
    });

    const billIds = matchedBills.map(b => b.id);
    let itemsSummary = [], totalQty = 0;
    if (billIds.length > 0) {
      const placeholders = billIds.map(() => '?').join(',');
      itemsSummary = await dbAll(`SELECT item_name, model, company, SUM(qty) as total_qty, SUM(total_amount) as total_sales FROM bill_items WHERE bill_id IN (${placeholders}) GROUP BY item_name, model ORDER BY total_sales DESC`, billIds);
      totalQty = itemsSummary.reduce((acc, curr) => acc + Number(curr.total_qty || 0), 0);
    }

    res.json({ year: selYear, total_bills: matchedBills.length, total_sales: totalSales, total_gst: totalGST,
      total_qty: totalQty, total_paid: totalPaid, total_pending: totalPending,
      monthly_breakdown: Object.values(monthMap), items: itemsSummary });
  } catch (err) {
    console.error('Yearly report error:', err);
    res.status(500).json({ error: 'Failed to fetch yearly report.' });
  }
});

router.get('/items', verifyToken, async (req, res) => {
  try {
    const { from_date, to_date, product, company } = req.query;
    let query = `SELECT bi.item_name, bi.model, bi.capacity, bi.company, bi.hsn_code,
      COUNT(DISTINCT bi.bill_id) as invoice_count, SUM(bi.qty) as total_quantity,
      SUM(bi.total_amount) as total_sales, SUM(bi.sgst_amount + bi.cgst_amount + bi.igst_amount) as total_gst
      FROM bill_items bi JOIN bills b ON bi.bill_id = b.id WHERE 1=1`;
    const params = [];
    if (from_date) { query += ` AND b.bill_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND b.bill_date <= ?`; params.push(to_date); }
    if (product) { query += ` AND (bi.item_name LIKE ? OR bi.model LIKE ?)`; params.push(`%${product}%`, `%${product}%`); }
    if (company) { query += ` AND bi.company LIKE ?`; params.push(`%${company}%`); }
    query += ` GROUP BY bi.item_name, bi.model, bi.company ORDER BY total_sales DESC`;
    const report = await dbAll(query, params);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items report.' });
  }
});

router.get('/customers', verifyToken, async (req, res) => {
  try {
    const { from_date, to_date, search } = req.query;
    let query = `SELECT c.id, c.name, c.village, c.taluka, c.district, c.mobile, c.gstin,
      COUNT(b.id) as total_bills, COALESCE(SUM(b.net_total), 0) as total_billed,
      COALESCE(SUM(b.paid_amount), 0) as total_paid, COALESCE(SUM(b.remaining_amount), 0) as pending_balance,
      MAX(b.bill_date) as last_bill_date FROM customers c LEFT JOIN bills b ON c.id = b.customer_id WHERE 1=1`;
    const params = [];
    if (search) { query += ` AND (c.name LIKE ? OR c.mobile LIKE ? OR c.village LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (from_date) { query += ` AND b.bill_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND b.bill_date <= ?`; params.push(to_date); }
    query += ` GROUP BY c.id ORDER BY total_billed DESC`;
    const report = await dbAll(query, params);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers report.' });
  }
});

module.exports = router;
