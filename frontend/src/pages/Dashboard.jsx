import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import StatCard from '../components/common/StatCard';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Users,
  Package,
  Clock,
  CheckCircle,
  PlusCircle,
  Eye,
  Printer,
  Download,
  AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await reportsAPI.getDashboard();
        setStats(res.data);
      } catch (err) {
        setError('Failed to load dashboard data: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Loading Krish Agriculture Dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Calculate maximum monthly sales for chart scaling
  const maxMonthly = Math.max(...(stats?.monthly_chart?.map((m) => m.sales) || [100000]), 100000);

  return (
    <div className="space-y-6">
      {/* 1. WELCOME HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-agri-950 via-agri-900 to-navy-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-agri-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white rounded-xl shadow-md shrink-0">
              <img
                src="/krish_logo.png"
                alt="KRISH AGRICULTURE"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-1">
                Official Business Management
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-serif text-white">
                KRISH AGRICULTURE
              </h1>
              <p className="text-xs sm:text-sm font-bold tracking-widest text-emerald-300 uppercase">
                SALES | SERVICE | SPARE PARTS
              </p>
              <p className="text-xs text-neutral-300 mt-1">
                GSTIN: <span className="font-mono font-bold text-white">24AVCPP4549E1ZN</span> &bull; Daramali, Himatnagar
              </p>
            </div>
          </div>

          {/* Hero Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/bills/new"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs uppercase tracking-wider shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Bill</span>
            </Link>

            <Link
              to="/bills"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider backdrop-blur transition-colors border border-white/20"
            >
              <FileText className="w-4 h-4" />
              <span>Browse Bills</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatINR(stats?.today_sales)}
          subtitle="Live daily billing"
          icon={DollarSign}
          color="agri"
        />
        <StatCard
          title="This Month's Sales"
          value={formatINR(stats?.this_month_sales)}
          subtitle="Current calendar month"
          icon={TrendingUp}
          color="navy"
        />
        <StatCard
          title="Paid Collections"
          value={formatINR(stats?.total_paid)}
          subtitle="Collected payments"
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Pending Receivables"
          value={formatINR(stats?.total_pending)}
          subtitle="Customer balance due"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Secondary quick counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-agri-100 text-agri-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase">Total Invoices</p>
              <h4 className="text-xl font-bold text-neutral-900 font-mono">{stats?.total_bills || 0} Bills</h4>
            </div>
          </div>
          <Link to="/bills" className="text-xs font-bold text-agri-700 hover:underline">View</Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase">Active Customers</p>
              <h4 className="text-xl font-bold text-neutral-900 font-mono">{stats?.total_customers || 0} Registered</h4>
            </div>
          </div>
          <Link to="/customers" className="text-xs font-bold text-blue-700 hover:underline">View</Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-800">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase">Catalog Items</p>
              <h4 className="text-xl font-bold text-neutral-900 font-mono">{stats?.total_items || 0} Products</h4>
            </div>
          </div>
          <Link to="/items" className="text-xs font-bold text-purple-700 hover:underline">View</Link>
        </div>
      </div>

      {/* 3. CHARTS & PRODUCT LEADERS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Sales Chart (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Monthly Billing Trends
              </h3>
              <p className="text-xs text-neutral-500">
                Revenue progression for calendar year {new Date().getFullYear()}
              </p>
            </div>
            <span className="text-xs font-bold text-agri-700 bg-agri-50 px-2.5 py-1 rounded-lg border border-agri-200">
              Total: {formatINR(stats?.this_year_sales)}
            </span>
          </div>

          {/* Pure CSS / SVG responsive bar chart */}
          <div className="h-60 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-neutral-200">
            {stats?.monthly_chart?.map((m, idx) => {
              const heightPct = maxMonthly > 0 ? Math.round((m.sales / maxMonthly) * 100) : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Hover tooltip */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-neutral-900 text-white text-[10px] py-1 px-2 rounded font-mono shadow-md z-20 whitespace-nowrap">
                    {m.month}: {formatINR(m.sales)}
                  </div>

                  <div
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                      m.sales > 0
                        ? 'bg-agri-700 group-hover:bg-agri-800'
                        : 'bg-neutral-100'
                    }`}
                  />
                  <span className="text-[10px] font-bold text-neutral-500 mt-2">
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              Top Selling Machinery
            </h3>
            <p className="text-xs text-neutral-500 mb-4">
              Best performing equipment & parts
            </p>

            <div className="space-y-3">
              {stats?.top_products?.length > 0 ? (
                stats.top_products.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-neutral-900 line-clamp-1">
                        {p.item_name}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {p.model || 'Standard'} &bull; {p.total_qty} units sold
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-agri-800">
                      {formatINR(p.total_revenue)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-neutral-400 italic">No sales recorded yet.</p>
              )}
            </div>
          </div>

          <Link
            to="/reports?tab=items"
            className="mt-4 inline-flex items-center justify-center text-xs font-bold text-agri-800 hover:text-agri-950 p-2 rounded-lg bg-agri-50 hover:bg-agri-100 transition-colors"
          >
            View Complete Item Sales Report &rarr;
          </Link>
        </div>
      </div>

      {/* 4. RECENT BILLS SECTION */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Recent Invoices
            </h3>
            <p className="text-xs text-neutral-500">
              Latest customer tax invoices created in the system
            </p>
          </div>
          <Link
            to="/bills"
            className="text-xs font-bold text-agri-800 hover:text-agri-950 hover:underline"
          >
            View All Bills ({stats?.total_bills || 0}) &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Bill No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Net Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stats?.recent_bills?.length > 0 ? (
                stats.recent_bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      {bill.bill_number}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {bill.bill_date}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      {bill.customer_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                      {formatINR(bill.net_total)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          bill.payment_status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.payment_status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {bill.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          className="p-1.5 text-neutral-500 hover:text-agri-700 hover:bg-neutral-100 rounded-lg"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/bills/${bill.id}?print=true`)}
                          className="p-1.5 text-neutral-500 hover:text-navy-700 hover:bg-neutral-100 rounded-lg"
                          title="Print Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-neutral-400">
                    No bills generated yet. Click "Create New Bill" to create your first tax invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
