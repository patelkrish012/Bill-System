import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import StatCard from '../components/common/StatCard';
import {
  BarChart3,
  Calendar,
  Package,
  Users,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Download
} from 'lucide-react';

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'monthly';

  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // Report States
  const [monthlyData, setMonthlyData] = useState(null);
  const [yearlyData, setYearlyData] = useState(null);
  const [itemsData, setItemsData] = useState([]);
  const [customersData, setCustomersData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Item-wise and Customer-wise
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchCurrentTabReport = async () => {
    try {
      setLoading(true);
      if (currentTab === 'monthly') {
        const res = await reportsAPI.getMonthly({ month, year });
        setMonthlyData(res.data);
      } else if (currentTab === 'yearly') {
        const res = await reportsAPI.getYearly({ year });
        setYearlyData(res.data);
      } else if (currentTab === 'items') {
        const res = await reportsAPI.getItems({ from_date: fromDate || undefined, to_date: toDate || undefined });
        setItemsData(res.data);
      } else if (currentTab === 'customers') {
        const res = await reportsAPI.getCustomers({ from_date: fromDate || undefined, to_date: toDate || undefined });
        setCustomersData(res.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTabReport();
  }, [currentTab, month, year, fromDate, toDate]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
            Sales & Tax Reports
          </h1>
          <p className="text-xs text-neutral-500">
            Comprehensive financial analytics, GST summaries, and customer statements
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print Report</span>
        </button>
      </div>

      {/* Report Navigation Tabs */}
      <div className="print:hidden flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
        {[
          { id: 'monthly', name: 'Monthly Report', icon: Calendar },
          { id: 'yearly', name: 'Yearly Report', icon: BarChart3 },
          { id: 'items', name: 'Item-Wise Sales', icon: Package },
          { id: 'customers', name: 'Customer-Wise Statement', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-agri-800 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Print Header banner */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-4">
        <h2 className="text-2xl font-black uppercase">KRISH AGRICULTURE</h2>
        <p className="text-xs font-bold tracking-widest uppercase">SALES | SERVICE | SPARE PARTS</p>
        <p className="text-xs">GSTIN: 24AVCPP4549E1ZN &bull; Daramali, Himatnagar</p>
        <h3 className="text-base font-bold uppercase mt-2">
          {currentTab.toUpperCase()} REPORT - {month}/{year}
        </h3>
      </div>

      {/* TAB 1: MONTHLY REPORT */}
      {currentTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month & Year Selectors */}
          <div className="print:hidden bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 uppercase">Month:</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none bg-white font-semibold"
              >
                {[
                  '01 - January', '02 - February', '03 - March', '04 - April',
                  '05 - May', '06 - June', '07 - July', '08 - August',
                  '09 - September', '10 - October', '11 - November', '12 - December'
                ].map((m, idx) => (
                  <option key={idx} value={String(idx + 1).padStart(2, '0')}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-neutral-600 uppercase">Year:</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none bg-white font-semibold"
              >
                {['2024', '2025', '2026', '2027'].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Monthly KPI Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Monthly Sales"
              value={formatINR(monthlyData?.total_sales)}
              subtitle={`${monthlyData?.total_bills || 0} Invoices created`}
              icon={DollarSign}
              color="agri"
            />
            <StatCard
              title="Total GST Collected"
              value={formatINR(monthlyData?.total_gst)}
              subtitle={`SGST: ${formatINR(monthlyData?.sgst_amount)} | CGST: ${formatINR(monthlyData?.cgst_amount)}`}
              icon={Percent}
              color="navy"
            />
            <StatCard
              title="Collected Receipts"
              value={formatINR(monthlyData?.total_paid)}
              subtitle="Paid by customers"
              icon={TrendingUp}
              color="emerald"
            />
            <StatCard
              title="Pending Receivables"
              value={formatINR(monthlyData?.total_pending)}
              subtitle="Outstanding dues"
              icon={FileText}
              color="amber"
            />
          </div>

          {/* Item-wise Sales breakdown for this month */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 font-bold text-sm text-neutral-800">
              Product Sales Breakdown for {month}/{year}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="bg-neutral-100 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">Model</th>
                    <th className="py-2.5 px-4">Manufacturer</th>
                    <th className="py-2.5 px-4 text-center">Quantity Sold</th>
                    <th className="py-2.5 px-4 text-right">Total Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {monthlyData?.items?.length > 0 ? (
                    monthlyData.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-bold text-neutral-900">{it.item_name}</td>
                        <td className="py-3 px-4 text-xs">{it.model || '-'}</td>
                        <td className="py-3 px-4 text-xs">{it.company || '-'}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{it.total_qty}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                          {formatINR(it.total_sales)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-neutral-400">
                        No product sales recorded in this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: YEARLY REPORT */}
      {currentTab === 'yearly' && (
        <div className="space-y-6">
          <div className="print:hidden bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex items-center gap-3">
            <label className="text-xs font-bold text-neutral-600 uppercase">Select Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-3 py-1.5 text-xs border border-neutral-300 rounded-lg outline-none bg-white font-semibold"
            >
              {['2024', '2025', '2026', '2027'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title={`Total Sales (${year})`}
              value={formatINR(yearlyData?.total_sales)}
              subtitle={`${yearlyData?.total_bills || 0} Invoices generated`}
              icon={DollarSign}
              color="agri"
            />
            <StatCard
              title={`Total GST Output (${year})`}
              value={formatINR(yearlyData?.total_gst)}
              subtitle="SGST + CGST + IGST"
              icon={Percent}
              color="navy"
            />
            <StatCard
              title={`Total Collections (${year})`}
              value={formatINR(yearlyData?.total_paid)}
              subtitle={`Pending: ${formatINR(yearlyData?.total_pending)}`}
              icon={TrendingUp}
              color="emerald"
            />
          </div>

          {/* Month-by-month table */}
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 font-bold text-sm text-neutral-800">
              Month-by-Month Statement ({year})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="bg-neutral-100 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-4">Month</th>
                    <th className="py-2.5 px-4 text-center">Bills</th>
                    <th className="py-2.5 px-4 text-right">Gross Sales (₹)</th>
                    <th className="py-2.5 px-4 text-right">GST Total (₹)</th>
                    <th className="py-2.5 px-4 text-right">Collected (₹)</th>
                    <th className="py-2.5 px-4 text-right">Balance Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {yearlyData?.monthly_breakdown?.map((m) => (
                    <tr key={m.month} className="hover:bg-neutral-50">
                      <td className="py-3 px-4 font-bold text-neutral-900">{m.name}</td>
                      <td className="py-3 px-4 text-center font-mono">{m.bills}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                        {formatINR(m.sales)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-neutral-700">
                        {formatINR(m.gst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {formatINR(m.paid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700">
                        {formatINR(m.pending)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ITEM-WISE SALES REPORT */}
      {currentTab === 'items' && (
        <div className="space-y-6">
          <div className="print:hidden bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              placeholder="From Date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              placeholder="To Date"
            />
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="px-3 py-1.5 text-xs text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Reset Dates
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Model & Capacity</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4 text-center">Invoices</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">GST Generated (₹)</th>
                    <th className="py-3 px-4 text-right">Total Sales (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {itemsData.length > 0 ? (
                    itemsData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">{item.item_name}</td>
                        <td className="py-3.5 px-4 text-xs">
                          {item.model} {item.capacity ? `(${item.capacity})` : ''}
                        </td>
                        <td className="py-3.5 px-4 text-xs">{item.company || '-'}</td>
                        <td className="py-3.5 px-4 text-center font-mono">{item.invoice_count}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-agri-800">
                          {item.total_quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-neutral-600">
                          {formatINR(item.total_gst)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                          {formatINR(item.total_sales)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-neutral-400">
                        No product sales records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER-WISE SALES STATEMENT */}
      {currentTab === 'customers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4 text-center">Invoices</th>
                    <th className="py-3 px-4 text-right">Total Billed (₹)</th>
                    <th className="py-3 px-4 text-right">Total Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Outstanding Dues (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {customersData.length > 0 ? (
                    customersData.map((c) => (
                      <tr key={c.id} className="hover:bg-neutral-50">
                        <td className="py-3.5 px-4 font-bold text-neutral-900">{c.name}</td>
                        <td className="py-3.5 px-4 text-xs">
                          {[c.village, c.taluka, c.district].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">{c.mobile || '-'}</td>
                        <td className="py-3.5 px-4 text-center font-mono">{c.total_bills}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                          {formatINR(c.total_billed)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                          {formatINR(c.total_paid)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold">
                          <span className={c.pending_balance > 0 ? 'text-rose-700' : 'text-neutral-500'}>
                            {formatINR(c.pending_balance)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-neutral-400">
                        No customer statements found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
