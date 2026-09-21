import React, { useState, useEffect } from 'react';
import { itemsAPI } from '../services/api';
import { formatINR } from '../utils/formatters';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  Tag,
  AlertCircle
} from 'lucide-react';

export default function ItemList() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    capacity: '',
    serial_no: '',
    unique_code: '',
    mf_year: '2025-26',
    company: '',
    rate: '',
    sgst_pct: 6,
    cgst_pct: 6,
    igst_pct: 12,
    hsn_code: '',
    description: '',
    stock_qty: 1
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await itemsAPI.getAll({
        search: search.trim() || undefined,
        company: selectedCompany || undefined,
        sort_by: sortBy,
      });
      setItems(res.data);
    } catch (err) {
      setError('Failed to fetch items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, selectedCompany, sortBy]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      model: '',
      capacity: '',
      serial_no: '',
      unique_code: '',
      mf_year: '2025-26',
      company: '',
      rate: '',
      sgst_pct: 6,
      cgst_pct: 6,
      igst_pct: 12,
      hsn_code: '',
      description: '',
      stock_qty: 1
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      model: item.model || '',
      capacity: item.capacity || '',
      serial_no: item.serial_no || '',
      unique_code: item.unique_code || '',
      mf_year: item.mf_year || '',
      company: item.company || '',
      rate: item.rate !== undefined ? item.rate : '',
      sgst_pct: item.sgst_pct !== undefined ? item.sgst_pct : 6,
      cgst_pct: item.cgst_pct !== undefined ? item.cgst_pct : 6,
      igst_pct: item.igst_pct !== undefined ? item.igst_pct : 12,
      hsn_code: item.hsn_code || '',
      description: item.description || '',
      stock_qty: item.stock_qty !== undefined ? item.stock_qty : 1
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.rate === '') {
      alert('Product name and rate are required.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await itemsAPI.update(editingItem.id, formData);
      } else {
        await itemsAPI.create(formData);
      }
      setModalOpen(false);
      fetchItems();
    } catch (err) {
      alert('Error saving product: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicate = async (item) => {
    try {
      await itemsAPI.duplicate(item.id);
      fetchItems();
    } catch (err) {
      alert('Failed to duplicate item: ' + err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      await itemsAPI.delete(item.id);
      fetchItems();
    } catch (err) {
      alert('Failed to delete item: ' + err.message);
    }
  };

  // Distinct company list for filter
  const companies = Array.from(new Set(items.map((i) => i.company).filter(Boolean)));

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
            Machinery & Spare Parts Catalog
          </h1>
          <p className="text-xs text-neutral-500">
            Manage agricultural equipment, rotavators, threshers, specifications, and GST rates
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, model, serial, code, HSN..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-1 focus:ring-agri-600"
            />
          </div>

          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none bg-white"
            >
              <option value="">All Companies / Manufacturers</option>
              {companies.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none bg-white font-medium"
            >
              <option value="name">Sort by: Product Name</option>
              <option value="rate">Sort by: Price / Rate</option>
              <option value="model">Sort by: Model</option>
              <option value="company">Sort by: Company</option>
              <option value="created_at">Sort by: Recently Added</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="bg-neutral-50 text-[11px] uppercase font-bold text-neutral-500 border-b border-neutral-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / Item</th>
                <th className="py-3 px-4">Model & Capacity</th>
                <th className="py-3 px-4">Serial / Unique Code</th>
                <th className="py-3 px-4">Company / MF</th>
                <th className="py-3 px-4">HSN</th>
                <th className="py-3 px-4 text-center">GST %</th>
                <th className="py-3 px-4 text-right">Base Rate (₹)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-neutral-800">{item.model || '-'}</div>
                      <div className="text-neutral-500">{item.capacity || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono">
                      <div>SR: {item.serial_no || '-'}</div>
                      <div className="text-[10px] text-neutral-400">{item.unique_code || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-neutral-700">
                      <div>{item.company || '-'}</div>
                      <div className="text-[10px] text-neutral-400">{item.mf_year || ''}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-neutral-500">
                      {item.hsn_code || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-mono">
                      <span className="bg-neutral-100 px-2 py-0.5 rounded text-neutral-800 font-bold">
                        {item.sgst_pct + item.cgst_pct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-neutral-900">
                      {formatINR(item.rate)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded-lg"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(item)}
                          className="p-1.5 text-neutral-600 hover:text-purple-700 hover:bg-neutral-100 rounded-lg"
                          title="Duplicate Item"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-neutral-400">
                    {loading ? 'Loading catalog...' : 'No products found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Product' : 'Add Machinery / Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Product / Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rotavator / Automatic Seed Drill"
                className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. MRT SM02"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Capacity
              </label>
              <input
                type="text"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g. HP35+ / Above 4 Tonne/HR"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Serial Number
              </label>
              <input
                type="text"
                value={formData.serial_no}
                onChange={(e) => setFormData({ ...formData, serial_no: e.target.value })}
                placeholder="e.g. 4998"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Unique Code
              </label>
              <input
                type="text"
                value={formData.unique_code}
                onChange={(e) => setFormData({ ...formData, unique_code: e.target.value })}
                placeholder="e.g. GJ/7050/445/2026/4998"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                MF Year
              </label>
              <input
                type="text"
                value={formData.mf_year}
                onChange={(e) => setFormData({ ...formData, mf_year: e.target.value })}
                placeholder="e.g. 2025-26"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Company / Manufacturer
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. METALTEC PRODUCTS PVT LTD"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Rate / Base Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                placeholder="e.g. 101252.68"
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-300 rounded-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                HSN / SAC Code
              </label>
              <input
                type="text"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                placeholder="e.g. 84328020"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                SGST %
              </label>
              <input
                type="number"
                value={formData.sgst_pct}
                onChange={(e) => setFormData({ ...formData, sgst_pct: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                CGST %
              </label>
              <input
                type="number"
                value={formData.cgst_pct}
                onChange={(e) => setFormData({ ...formData, cgst_pct: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Description / Notes
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Features, specifications..."
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
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
              {submitting ? 'Saving...' : editingItem ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
