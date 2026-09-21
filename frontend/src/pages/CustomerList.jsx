import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function CustomerList() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    village: '',
    taluka: '',
    district: '',
    state: 'Gujarat',
    mobile: '',
    gstin: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Customer Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customersAPI.getAll({ search: search.trim() || undefined });
      setCustomers(res.data);
    } catch (err) {
      setError('Failed to load customers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      address: '',
      village: '',
      taluka: '',
      district: '',
      state: 'Gujarat',
      mobile: '',
      gstin: ''
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      address: customer.address || '',
      village: customer.village || '',
      taluka: customer.taluka || '',
      district: customer.district || '',
      state: customer.state || 'Gujarat',
      mobile: customer.mobile || '',
      gstin: customer.gstin || ''
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Customer name is required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, formData);
      } else {
        await customersAPI.create(formData);
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert('Failed to save customer: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCustomer = async (id) => {
    try {
      setLoadingDetails(true);
      setDetailsModalOpen(true);
      const res = await customersAPI.getById(id);
      setSelectedCustomerDetails(res.data);
    } catch (err) {
      alert('Error fetching customer history: ' + err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async (customer) => {
    if (customer.total_bills > 0) {
      alert(`Cannot delete ${customer.name} because they have ${customer.total_bills} active bill(s).`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete customer ${customer.name}?`)) return;

    try {
      await customersAPI.delete(customer.id);
      fetchCustomers();
    } catch (err) {
      alert('Error deleting customer: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-neutral-500">
            Manage customer profiles, village records, and view customer-wise billing history
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, mobile, village, district..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-agri-600"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Location (Village / Taluka)</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4 text-center">Bills</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Pending Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900">{c.name}</div>
                      {c.gstin && (
                        <div className="text-[10px] font-mono text-neutral-400">
                          GSTIN: {c.gstin}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-700">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>
                          {[c.village, c.taluka, c.district].filter(Boolean).join(', ') || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {c.mobile ? (
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <Phone className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{c.mobile}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-neutral-800">
                      {c.total_bills}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                      {formatINR(c.total_purchase)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={c.pending_amount > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                        {formatINR(c.pending_amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleViewCustomer(c.id)}
                          className="p-1.5 text-neutral-600 hover:text-agri-700 hover:bg-neutral-100 rounded-lg"
                          title="View Customer Bills"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded-lg"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete Customer"
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
                    {loading ? 'Loading customers...' : 'No customers registered yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Information' : 'Add New Customer'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Customer Name * (English / ગુજરાતી)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. પટેલ ગણેશભાઈ જીવાભાઈ / Ramesh Patel"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Village (ગામ)
              </label>
              <input
                type="text"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. ડુંગરી / Daramali"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Taluka (તાલુકો)
              </label>
              <input
                type="text"
                value={formData.taluka}
                onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                placeholder="e.g. ઇડર / Himatnagar"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                District (જિલ્લો)
              </label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. સાબરકાંઠા"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 98251 44521"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Customer Address / Street
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. Near Bus Stand, Main Road"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Customer GSTIN (Optional)
            </label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              placeholder="e.g. 24AAACP1234A1Z5"
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Customer Full Billing History Modal */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={selectedCustomerDetails ? `${selectedCustomerDetails.customer.name} - Billing Ledger` : 'Customer History'}
        maxWidth="max-w-3xl"
      >
        {loadingDetails ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-neutral-500">Loading customer invoices...</p>
          </div>
        ) : selectedCustomerDetails ? (
          <div className="space-y-4">
            {/* Stats summary banner */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Invoices</span>
                <div className="font-mono font-bold text-neutral-900 mt-0.5">
                  {selectedCustomerDetails.stats.total_bills}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Total Billed</span>
                <div className="font-mono font-bold text-neutral-900 mt-0.5">
                  {formatINR(selectedCustomerDetails.stats.total_purchases)}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Total Paid</span>
                <div className="font-mono font-bold text-emerald-700 mt-0.5">
                  {formatINR(selectedCustomerDetails.stats.total_paid)}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500">Pending Balance</span>
                <div className="font-mono font-bold text-rose-700 mt-0.5">
                  {formatINR(selectedCustomerDetails.stats.pending_balance)}
                </div>
              </div>
            </div>

            {/* Invoices List */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100 text-[10px] uppercase font-bold text-neutral-600 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Bill No.</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {selectedCustomerDetails.bills.length > 0 ? (
                    selectedCustomerDetails.bills.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-mono font-bold text-neutral-900">
                          {b.bill_number}
                        </td>
                        <td className="py-2 px-3 font-mono">{b.bill_date}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-neutral-900">
                          {formatINR(b.net_total)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              b.payment_status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.payment_status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {b.payment_status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => {
                              setDetailsModalOpen(false);
                              navigate(`/bills/${b.id}`);
                            }}
                            className="text-agri-700 hover:underline font-bold"
                          >
                            View Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-neutral-400">
                        No bills created for this customer yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
