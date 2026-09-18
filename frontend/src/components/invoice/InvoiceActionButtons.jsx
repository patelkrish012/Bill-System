import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Download, Share2, Edit, DollarSign, Copy, ArrowLeft } from 'lucide-react';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';
import { billsAPI } from '../../services/api';

export default function InvoiceActionButtons({ bill, onPaymentClick, onBillUpdated }) {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);

  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const cleanCustomer = (bill.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `TAX_INVOICE_BILL_${bill.bill_number}_${cleanCustomer}.pdf`;
      await downloadInvoicePDF('printable-invoice-area', filename);
    } catch (err) {
      alert('Error generating PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `KRISH AGRICULTURE\nTAX INVOICE\nBill No: ${bill.bill_number}\nDate: ${bill.bill_date}\nCustomer: ${bill.customer_name}\nNet Total: ₹${bill.net_total.toLocaleString('en-IN')}\nPayment Status: ${bill.payment_status.toUpperCase()}\n\nThank you for doing business with Krish Agriculture!`
    );
    const phone = bill.customer_mobile ? bill.customer_mobile.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://api.whatsapp.com/send?phone=91${phone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleDuplicate = async () => {
    if (!window.confirm(`Create a new bill draft duplicating Bill No. ${bill.bill_number}?`)) return;
    try {
      setDuplicating(true);
      // Pre-fill create bill with this bill's data
      navigate('/bills/new', { state: { duplicateFrom: bill } });
    } catch (err) {
      alert('Failed to duplicate: ' + err.message);
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="print:hidden bg-white border border-neutral-200 rounded-xl p-4 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/bills')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bills
        </button>
        <span className="text-sm font-bold text-neutral-500">|</span>
        <span className="text-sm font-bold text-agri-800">
          Bill No: <span className="font-mono text-base font-black text-neutral-900">{bill.bill_number}</span>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all hover:shadow"
        >
          <Printer className="w-4 h-4" />
          Print Bill
        </button>

        {/* Download PDF Button */}
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-sm transition-all hover:shadow disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>

        {/* WhatsApp Share */}
        <button
          onClick={handleWhatsAppShare}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          WhatsApp
        </button>

        {/* Record Payment */}
        {onPaymentClick && bill.payment_status !== 'paid' && (
          <button
            onClick={onPaymentClick}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            <DollarSign className="w-4 h-4" />
            Record Payment
          </button>
        )}

        {/* Edit Bill */}
        <button
          onClick={() => navigate(`/bills/${bill.id}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit Bill
        </button>

        {/* Duplicate */}
        <button
          onClick={handleDuplicate}
          disabled={duplicating}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
      </div>
    </div>
  );
}
