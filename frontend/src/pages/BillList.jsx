import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { billsAPI, customersAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import TaxInvoiceA4 from '../components/invoice/TaxInvoiceA4';
import Modal from '../components/common/Modal';
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  Edit,
  Printer,
  Download,
  Copy,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

export default function BillList() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [groupByCustomer, setGroupByCustomer] = useState(false);

  // Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Background PDF download state
  const [pdfGeneratingBill, setPdfGeneratingBill] = useState(null);

  const fetchBills = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        customer_id: selectedCustomerId || undefined,
        payment_status: paymentStatus || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };

      const res = await billsAPI.getAll(params);
      setBills(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError('Failed to fetch bills: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await customersAPI.getAll();
        setCustomers(res.data);
      } catch (e) {}
    }
    loadCustomers();
  }, []);

  useEffect(() => {
    fetchBills(1);
  }, [search, selectedCustomerId, paymentStatus, fromDate, toDate]);

  const handleDeleteConfirm = async () => {
    if (!billToDelete) return;
    try {
      setDeleting(true);
      await billsAPI.delete(billToDelete.id);
      setDeleteModalOpen(false);
      setBillToDelete(null);
      fetchBills(pagination.page);
    } catch (err) {
      alert('Failed to delete bill: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async (bill) => {
    try {
      setPdfGeneratingBill(bill);
      // Allow offscreen component to render
      setTimeout(async () => {
        const cleanCustomer = (bill.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
        await downloadInvoicePDF('offscreen-pdf-area', `TAX_INVOICE_BILL_${bill.bill_number}_${cleanCustomer}.pdf`);
        setPdfGeneratingBill(null);
      }, 300);
    } catch (err) {
      alert('PDF generation error: ' + err.message);
      setPdfGeneratingBill(null);
    }
  };

  // Group bills by customer for customer-wise view
  const customerGroupedBills = {};
  if (groupByCustomer) {
    bills.forEach((b) => {
      const cName = b.customer_name || 'Unknown Customer';
      if (!customerGroupedBills[cName]) {
        customerGroupedBills[cName] = [];
      }
      customerGroupedBills[cName].push(b);
    });
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
            Customer Invoices & Bills
          </h1>
          <p className="text-xs text-neutral-500">
            Search, filter, view, print, and manage all Krish Agriculture tax invoices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setGroupByCustomer(!groupByCustomer)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
              groupByCustomer
                ? 'bg-agri-100 text-agri-900 border-agri-300'
                : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{groupByCustomer ? 'Standard Table' : 'Customer-Wise Grouping'}</span>
          </button>

          <Link
            to="/bills/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all hover:shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Bill</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Bill #, Customer, Serial, Unique Code..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-agri-600"
            />
          </div>

          {/* Customer filter */}
          <div>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg outline-none bg-white"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg outline-none bg-white"
            >
              <option value="">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Reset button */}
          <div>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCustomerId('');
                setPaymentStatus('');
                setFromDate('');
                setToDate('');
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer-Wise Grouping View */}
      {groupByCustomer ? (
        <div className="space-y-6">
          {Object.keys(customerGroupedBills).length > 0 ? (
            Object.entries(customerGroupedBills).map(([custName, custBills]) => (
              <div key={custName} className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
                <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-agri-700" />
                    <h3 className="text-sm font-bold text-neutral-900">{custName}</h3>
                    <span className="text-xs text-neutral-500 font-semibold">
                      ({custBills.length} {custBills.length === 1 ? 'bill' : 'bills'})
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-neutral-800">
                    Total: {formatINR(custBills.reduce((acc, b) => acc + b.net_total, 0))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-neutral-600">
                    <thead className="bg-neutral-100/50 text-[10px] uppercase font-bold text-neutral-500 border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-4">Bill No.</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Products</th>
                        <th className="py-2.5 px-4 text-right">Net Total</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {custBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-neutral-50">
                          <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                            {bill.bill_number}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono">{bill.bill_date}</td>
                          <td className="py-3 px-4 text-xs">
                            {bill.items?.map((i) => i.item_name).join(', ') || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900">
                            {formatINR(bill.net_total)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
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
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/bills/${bill.id}`)}
                                className="p-1.5 text-neutral-500 hover:text-agri-700 hover:bg-neutral-100 rounded"
                                title="View Bill"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => navigate(`/bills/${bill.id}?print=true`)}
                                className="p-1.5 text-neutral-500 hover:text-navy-700 hover:bg-neutral-100 rounded"
                                title="Print Bill"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-neutral-200 text-neutral-400">
              No bills match your current search.
            </div>
          )}
        </div>
      ) : (
        /* Standard Table View */
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bill No.</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Equipment / Products</th>
                  <th className="py-3 px-4 text-right">Net Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {bills.length > 0 ? (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                        {bill.bill_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">{bill.customer_name}</div>
                        <div className="text-[11px] text-neutral-400">
                          {bill.customer_village ? `${bill.customer_village}, ` : ''}{bill.customer_district || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-neutral-600">
                        {bill.bill_date}
                      </td>
                      <td className="py-3.5 px-4 text-xs max-w-xs truncate text-neutral-700">
                        {bill.items?.map((i) => i.item_name).join(', ') || '-'}
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/bills/${bill.id}`)}
                            className="p-1.5 text-neutral-600 hover:text-agri-700 hover:bg-neutral-100 rounded-lg"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/bills/${bill.id}/edit`)}
                            className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded-lg"
                            title="Edit Bill"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/bills/${bill.id}?print=true`)}
                            className="p-1.5 text-neutral-600 hover:text-navy-700 hover:bg-neutral-100 rounded-lg"
                            title="Print Invoice"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(bill)}
                            className="p-1.5 text-neutral-600 hover:text-emerald-700 hover:bg-neutral-100 rounded-lg"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate('/bills/new', { state: { duplicateFrom: bill } })}
                            className="p-1.5 text-neutral-600 hover:text-purple-700 hover:bg-neutral-100 rounded-lg"
                            title="Duplicate Bill"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setBillToDelete(bill);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-neutral-400">
                      {loading ? 'Loading bills...' : 'No bills found matching your criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <div>
              Showing {bills.length} of {pagination.total} invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchBills(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => fetchBills(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Bill Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to delete Tax Invoice <strong className="font-mono text-neutral-900 font-bold">Bill No. {billToDelete?.bill_number}</strong> for <strong className="text-neutral-900">{billToDelete?.customer_name}</strong>?
          </p>
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            Warning: This will permanently remove the invoice, item records, and associated payments.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Invoice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Offscreen A4 container for instant PDF download from list */}
      {pdfGeneratingBill && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
          <div id="offscreen-pdf-area">
            <TaxInvoiceA4 bill={pdfGeneratingBill} />
          </div>
        </div>
      )}
    </div>
  );
}
