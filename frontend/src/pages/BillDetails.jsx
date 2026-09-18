import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { billsAPI, paymentsAPI } from '../services/api';
import TaxInvoiceA4 from '../components/invoice/TaxInvoiceA4';
import InvoiceActionButtons from '../components/invoice/InvoiceActionButtons';
import Modal from '../components/common/Modal';
import { formatINR } from '../utils/formatters';
import { CreditCard, History, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BillDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  const fetchBillData = async () => {
    try {
      setLoading(true);
      const res = await billsAPI.getById(id);
      setBill(res.data);
      if (res.data.remaining_amount > 0) {
        setPayAmount(res.data.remaining_amount);
      }
    } catch (err) {
      setError('Failed to load invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillData();
  }, [id]);

  // Handle auto-print after load if requested
  useEffect(() => {
    if (bill && shouldAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [bill, shouldAutoPrint]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setSubmittingPay(true);
      await paymentsAPI.create({
        bill_id: id,
        amount: Number(payAmount),
        payment_method: payMethod,
        transaction_ref: payRef,
        payment_date: payDate,
        notes: payNotes
      });

      setPaymentModalOpen(false);
      setPayNotes('');
      setPayRef('');
      await fetchBillData();
    } catch (err) {
      alert('Payment recording failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingPay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <span>{error || 'Bill not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Action Toolbar */}
      <InvoiceActionButtons
        bill={bill}
        onPaymentClick={() => setPaymentModalOpen(true)}
        onBillUpdated={fetchBillData}
      />

      {/* Pristine A4 Invoice View */}
      <div className="overflow-x-auto pb-6">
        <TaxInvoiceA4 bill={bill} />
      </div>

      {/* Payment & Audit History Section (Screen only) */}
      <div className="print:hidden mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payments Ledger for this invoice */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-agri-700" />
              Payments Ledger
            </h3>
            {bill.remaining_amount > 0 && (
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="px-2.5 py-1 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
              >
                + Add Payment
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 p-3 bg-neutral-50 rounded-xl text-center text-xs">
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold">Total Bill</div>
                <div className="font-mono font-bold text-neutral-900 mt-0.5">{formatINR(bill.net_total)}</div>
              </div>
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold">Paid</div>
                <div className="font-mono font-bold text-emerald-700 mt-0.5">{formatINR(bill.paid_amount)}</div>
              </div>
              <div>
                <div className="text-neutral-500 text-[10px] uppercase font-bold">Remaining</div>
                <div className="font-mono font-bold text-rose-700 mt-0.5">{formatINR(bill.remaining_amount)}</div>
              </div>
            </div>

            {bill.payments && bill.payments.length > 0 ? (
              <div className="divide-y divide-neutral-100">
                {bill.payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-neutral-900 font-mono">
                        {formatINR(p.amount)}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {p.payment_date} &bull; <span className="uppercase font-semibold">{p.payment_method}</span>
                        {p.transaction_ref && ` (Ref: ${p.transaction_ref})`}
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      By {p.created_by}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-neutral-400 text-xs italic">
                No payments recorded yet for this invoice.
              </div>
            )}
          </div>
        </div>

        {/* Audit History */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="border-b border-neutral-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-navy-700" />
              Invoice Audit History
            </h3>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            <div className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-agri-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-neutral-900">
                  Bill Created by <span className="text-agri-800">{bill.created_by || 'Staff'}</span>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono">
                  {bill.created_at}
                </div>
              </div>
            </div>

            {bill.audit_history?.map((log) => (
              <div key={log.id} className="flex items-start gap-2.5 text-xs pt-2 border-t border-neutral-100">
                <Clock className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-neutral-800">
                    {log.details}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {log.timestamp} &bull; {log.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Record Payment for Bill #${bill.bill_number}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full px-3 py-2 text-base font-mono font-bold border border-neutral-300 rounded-lg outline-none"
              required
            />
            <span className="text-[11px] text-neutral-500">
              Outstanding Due: <strong className="font-mono text-rose-700">{formatINR(bill.remaining_amount)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Payment Method
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Cheque No. / Transaction Ref ID
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="e.g. CHQ-123456 or UPI Reference"
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="e.g. Received via PhonePe"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingPay}
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg disabled:opacity-50"
            >
              {submittingPay ? 'Recording...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
