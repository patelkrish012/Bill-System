import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentsAPI, billsAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import StatCard from '../components/common/StatCard';
import {
  CreditCard,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function PaymentLedger() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentsAPI.getAll({
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setPayments(res.data);
    } catch (err) {
      setError('Failed to load payments: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [fromDate, toDate]);

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete payment of ₹${p.amount} for Bill #${p.bill_number}?`)) return;
    try {
      await paymentsAPI.delete(p.id);
      fetchPayments();
    } catch (err) {
      alert('Error deleting payment: ' + err.message);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (methodFilter && p.payment_method !== methodFilter) return false;
    return true;
  });

  const totalCollected = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
            Payments & Collection Ledger
          </h1>
          <p className="text-xs text-neutral-500">
            Track customer payments across Cash, UPI, Cheques, and Bank Transfers
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Filtered Collections"
          value={formatINR(totalCollected)}
          subtitle="Selected period collections"
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Payment Transactions"
          value={filteredPayments.length}
          subtitle="Processed receipts"
          icon={CreditCard}
          color="agri"
        />
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col justify-between">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Collection Methods
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {['cash', 'upi', 'cheque', 'bank_transfer'].map((m) => {
              const mTotal = payments.filter((p) => p.payment_method === m).reduce((acc, p) => acc + p.amount, 0);
              return (
                <div key={m} className="px-2.5 py-1 bg-neutral-50 border border-neutral-200 rounded-lg text-xs">
                  <span className="uppercase text-[10px] font-bold text-neutral-500 block">{m}</span>
                  <span className="font-mono font-bold text-neutral-900">{formatINR(mTotal)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="">All Payment Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI / Online</option>
              <option value="cheque">Cheque</option>
              <option value="bank_transfer">Bank Transfer / NEFT</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="From Date"
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="To Date"
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Bill No.</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Transaction / Cheque Ref</th>
                <th className="py-3 px-4 text-right">Amount Received (₹)</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-700">
                      {p.payment_date}
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/bills/${p.bill_id}`}
                        className="font-mono font-bold text-agri-800 hover:underline inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>#{p.bill_number}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      {p.customer_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-800">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-neutral-500">
                      {p.transaction_ref || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-800">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-neutral-400">
                      {p.created_by}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete Payment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-neutral-400">
                    {loading ? 'Loading payment records...' : 'No payment records found.'}
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
