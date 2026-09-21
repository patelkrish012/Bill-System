import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { billsAPI, customersAPI, itemsAPI, settingsAPI } from '../services/api';
import { formatINR, numberToIndianWords, formatDate, toInputDate } from '../utils/formatters';
import TaxInvoiceA4 from '../components/invoice/TaxInvoiceA4';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Eye,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  User,
  Calculator
} from 'lucide-react';

export default function CreateBill() {
  const navigate = useNavigate();
  const location = useLocation();

  // Next bill number & business settings
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(() => {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, '0');
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  });
  const [inputDate, setInputDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Customer State
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [customerTaluka, setCustomerTaluka] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');

  // Tax and Calculation State
  const [taxType, setTaxType] = useState('intra_state'); // intra_state (SGST+CGST) or inter_state (IGST)
  const [itemsList, setItemsList] = useState([]);
  const [billItems, setBillItems] = useState([
    {
      item_id: null,
      item_name: '',
      model: '',
      capacity: '',
      serial_no: '',
      unique_code: '',
      mf_year: '2025-26',
      company: '',
      hsn_code: '',
      description_text: '',
      qty: 1,
      rate: 0,
      sgst_pct: 6,
      cgst_pct: 6,
      igst_pct: 12
    }
  ]);

  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [notes, setNotes] = useState('');

  // Settings Snapshot placeholder for live preview
  const [settingsSnapshot, setSettingsSnapshot] = useState(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load: Next Bill No, Customers, Items, Settings
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [nextNoRes, custRes, itemRes, setRes] = await Promise.all([
          billsAPI.getNextNumber(),
          customersAPI.getAll(),
          itemsAPI.getAll(),
          settingsAPI.getSettings()
        ]);

        setBillNumber(nextNoRes.data.next_bill_number);
        setCustomers(custRes.data);
        setItemsList(itemRes.data);
        setSettingsSnapshot(setRes.data);

        // Check if duplicating from existing bill
        if (location.state?.duplicateFrom) {
          const dup = location.state.duplicateFrom;
          setCustomerName(dup.customer_name || '');
          setCustomerAddress(dup.customer_address || '');
          setCustomerVillage(dup.customer_village || '');
          setCustomerTaluka(dup.customer_taluka || '');
          setCustomerDistrict(dup.customer_district || '');
          setCustomerMobile(dup.customer_mobile || '');
          setCustomerGSTIN(dup.customer_gstin || '');
          setTaxType(dup.tax_type || 'intra_state');
          setDiscount(dup.discount_amount || 0);
          setOtherCharges(dup.other_charges || 0);
          setRoundOff(dup.round_off || 0);
          setNotes(dup.notes ? `Cloned from Bill ${dup.bill_number}: ${dup.notes}` : '');

          if (dup.items && dup.items.length > 0) {
            setBillItems(dup.items.map(item => ({
              ...item,
              qty: item.qty || 1,
              rate: item.rate || 0,
              sgst_pct: item.sgst_pct !== undefined ? item.sgst_pct : 6,
              cgst_pct: item.cgst_pct !== undefined ? item.cgst_pct : 6,
              igst_pct: item.igst_pct !== undefined ? item.igst_pct : 12,
            })));
          }
        }
      } catch (err) {
        setError('Failed to initialize bill creation: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [location.state]);

  // Handle Date picker change
  const handleDateChange = (e) => {
    const val = e.target.value; // YYYY-MM-DD
    setInputDate(val);
    const [y, m, d] = val.split('-');
    setBillDate(`${d}/${m}/${y}`);
  };

  // Handle Customer Selection
  const handleCustomerSelect = (e) => {
    const id = e.target.value;
    setSelectedCustomerId(id);
    if (!id) return;

    const found = customers.find(c => String(c.id) === String(id));
    if (found) {
      setCustomerName(found.name);
      setCustomerAddress(found.address || '');
      setCustomerVillage(found.village || '');
      setCustomerTaluka(found.taluka || '');
      setCustomerDistrict(found.district || '');
      setCustomerState(found.state || 'Gujarat');
      setCustomerMobile(found.mobile || '');
      setCustomerGSTIN(found.gstin || '');
    }
  };

  // Handle Item Selection for a specific row
  const handleItemSelect = (index, itemId) => {
    const found = itemsList.find(i => String(i.id) === String(itemId));
    const updated = [...billItems];

    if (found) {
      // Build standard multi-line description
      const descLines = [];
      if (found.model) descLines.push(`${found.name} Model:\n${found.model}`);
      else descLines.push(found.name);
      if (found.capacity) descLines.push(`CAPACITY:\n${found.capacity}`);
      if (found.serial_no) descLines.push(`SR.NO:\n${found.serial_no}`);
      if (found.unique_code) descLines.push(`UNIQ.CODE:\n${found.unique_code}`);
      if (found.mf_year) descLines.push(`MF, YEAR:\n${found.mf_year}`);
      if (found.company) descLines.push(`Company:\n${found.company}`);
      if (found.hsn_code) descLines.push(`HSN Code:-${found.hsn_code}`);

      updated[index] = {
        ...updated[index],
        item_id: found.id,
        item_name: found.name,
        model: found.model || '',
        capacity: found.capacity || '',
        serial_no: found.serial_no || '',
        unique_code: found.unique_code || '',
        mf_year: found.mf_year || '',
        company: found.company || '',
        hsn_code: found.hsn_code || '',
        rate: found.rate || 0,
        sgst_pct: found.sgst_pct !== undefined ? found.sgst_pct : 6,
        cgst_pct: found.cgst_pct !== undefined ? found.cgst_pct : 6,
        igst_pct: found.igst_pct !== undefined ? found.igst_pct : 12,
        description_text: descLines.join('\n')
      };
    } else {
      updated[index].item_id = null;
    }

    setBillItems(updated);
  };

  // Update Item field
  const updateItemField = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    setBillItems(updated);
  };

  // Add Item Row
  const addItemRow = () => {
    setBillItems([
      ...billItems,
      {
        item_id: null,
        item_name: '',
        model: '',
        capacity: '',
        serial_no: '',
        unique_code: '',
        mf_year: '2025-26',
        company: '',
        hsn_code: '',
        description_text: '',
        qty: 1,
        rate: 0,
        sgst_pct: 6,
        cgst_pct: 6,
        igst_pct: 12
      }
    ]);
  };

  // Remove Item Row
  const removeItemRow = (index) => {
    if (billItems.length === 1) {
      alert('A bill must contain at least one item.');
      return;
    }
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Real-time Calculations
  let subtotal = 0;
  let totalSGST = 0;
  let totalCGST = 0;
  let totalIGST = 0;

  billItems.forEach(item => {
    const q = Number(item.qty) || 0;
    const r = Number(item.rate) || 0;
    const itemSub = q * r;
    subtotal += itemSub;

    if (taxType === 'intra_state') {
      const sPct = Number(item.sgst_pct) || 0;
      const cPct = Number(item.cgst_pct) || 0;
      totalSGST += (itemSub * sPct) / 100;
      totalCGST += (itemSub * cPct) / 100;
    } else {
      const iPct = Number(item.igst_pct) || 0;
      totalIGST += (itemSub * iPct) / 100;
    }
  });

  const discNum = Number(discount) || 0;
  const otherNum = Number(otherCharges) || 0;
  const roffNum = Number(roundOff) || 0;

  const netTotal = Math.round((subtotal + totalSGST + totalCGST + totalIGST + otherNum - discNum + roffNum) * 100) / 100;
  const amountWords = numberToIndianWords(netTotal);

  // Construct Live Preview Bill Object
  const previewBill = {
    bill_number: billNumber || 'DRAFT',
    bill_date: billDate,
    customer_name: customerName || 'Customer Name',
    customer_address: customerAddress,
    customer_village: customerVillage,
    customer_taluka: customerTaluka,
    customer_district: customerDistrict,
    customer_mobile: customerMobile,
    customer_gstin: customerGSTIN,
    tax_type: taxType,
    subtotal,
    sgst_amount: totalSGST,
    cgst_amount: totalCGST,
    igst_amount: totalIGST,
    discount_amount: discNum,
    other_charges: otherNum,
    round_off: roffNum,
    net_total: netTotal,
    amount_in_words: amountWords,
    payment_status: 'pending',
    items: billItems.map(item => ({
      ...item,
      total_amount: (Number(item.qty) || 0) * (Number(item.rate) || 0)
    })),
    business_name_snap: settingsSnapshot?.business?.business_name || 'KRISH AGRICULTURE',
    tagline_snap: settingsSnapshot?.business?.tagline || 'SALES | SERVICE | SPARE PARTS',
    gstin_snap: settingsSnapshot?.business?.gstin || '24AVCPP4549E1ZN',
    mobile_snap: settingsSnapshot?.business?.mobile || '94297 62695',
    email_snap: settingsSnapshot?.business?.email || 'krishagriculturehmt@gmail.com',
    address_snap: settingsSnapshot?.business?.address || 'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)',
    logo_path_snap: '/krish_logo.png',
    parsed_bank: settingsSnapshot?.banks?.find(b => b.is_default) || settingsSnapshot?.banks?.[0] || null,
    parsed_terms: settingsSnapshot?.terms?.map(t => t.term_text) || []
  };

  // Submit Bill
  const handleSubmit = async (action = 'view') => {
    if (!customerName.trim()) {
      setError('Please enter or select a customer name.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!billNumber.trim()) {
      setError('Bill number cannot be empty.');
      return;
    }
    if (billItems.some(item => !item.item_name.trim())) {
      setError('Every item row must have an item name.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        bill_number: billNumber,
        bill_date: billDate,
        customer_id: selectedCustomerId || null,
        customer_name: customerName.trim(),
        customer_address: customerAddress.trim(),
        customer_village: customerVillage.trim(),
        customer_taluka: customerTaluka.trim(),
        customer_district: customerDistrict.trim(),
        customer_state: customerState.trim(),
        customer_mobile: customerMobile.trim(),
        customer_gstin: customerGSTIN.trim(),
        tax_type: taxType,
        items: billItems,
        discount_amount: discNum,
        other_charges: otherNum,
        round_off: roffNum,
        payment_status: 'pending',
        paid_amount: 0,
        payment_method: 'cash',
        payment_ref: '',
        notes: notes.trim()
      };

      const res = await billsAPI.create(payload);
      const createdId = res.data.id;

      if (action === 'print') {
        navigate(`/bills/${createdId}?print=true`);
      } else {
        navigate(`/bills/${createdId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save bill: ' + err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bills')}
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
              Create New Tax Invoice
            </h1>
            <p className="text-xs text-neutral-500">
              Official Tax Invoice for Krish Agriculture
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              showLivePreview
                ? 'bg-agri-100 text-agri-900 border border-agri-300'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{showLivePreview ? 'Hide Preview' : 'Live A4 Preview'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('print')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-navy-800 hover:bg-navy-900 shadow-sm disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('view')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 shadow-md hover:shadow transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Generate Bill'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Form (Left) & Preview (Right if active) */}
      <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-12 gap-6' : ''}`}>
        {/* Form Container */}
        <div className={`${showLivePreview ? 'lg:col-span-6' : 'w-full'} space-y-6`}>
          {/* 1. INVOICE META CARD */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-agri-700" />
                Invoice Identification
              </h3>
              <span className="text-[11px] font-semibold text-neutral-400">
                Business GSTIN: <strong className="font-mono text-neutral-700">24AVCPP4549E1ZN</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Bill Number *
                </label>
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                  placeholder="e.g. 041"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Bill Date (DD/MM/YYYY) *
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Tax Classification
                </label>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none font-semibold text-neutral-800"
                >
                  <option value="intra_state">Intra-State (SGST + CGST)</option>
                  <option value="inter_state">Inter-State (IGST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. CUSTOMER DETAILS CARD */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-agri-700" />
                Customer Details
              </h3>
              {customers.length > 0 && (
                <div className="w-56">
                  <select
                    value={selectedCustomerId}
                    onChange={handleCustomerSelect}
                    className="w-full px-2.5 py-1 text-xs border border-neutral-300 rounded-lg focus:ring-1 focus:ring-agri-600 outline-none bg-neutral-50"
                  >
                    <option value="">-- Load Existing Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.village || c.mobile || 'Guj'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Customer Name * (English / ગુજરાતી)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. પટેલ ગણેશભાઈ જીવાભાઈ / Ramesh Patel"
                  className="w-full px-3 py-2 text-sm font-semibold border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Village (ગામ)
                </label>
                <input
                  type="text"
                  value={customerVillage}
                  onChange={(e) => setCustomerVillage(e.target.value)}
                  placeholder="e.g. ડુંગરી / Daramali"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Taluka (તાલુકો)
                </label>
                <input
                  type="text"
                  value={customerTaluka}
                  onChange={(e) => setCustomerTaluka(e.target.value)}
                  placeholder="e.g. ઇડર / Himatnagar"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  District (જિલ્લો)
                </label>
                <input
                  type="text"
                  value={customerDistrict}
                  onChange={(e) => setCustomerDistrict(e.target.value)}
                  placeholder="e.g. સાબરકાંઠા / Sabarkantha"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  placeholder="e.g. 98251 44521"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Customer GSTIN (Optional &mdash; Not Business GSTIN)
                </label>
                <input
                  type="text"
                  value={customerGSTIN}
                  onChange={(e) => setCustomerGSTIN(e.target.value)}
                  placeholder="e.g. 24AAACP1234A1Z5 (Leaves blank if unregistered farmer)"
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. ITEM SELECTION & MULTI-LINE SPECS */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-agri-700" />
                Products & Equipment ({billItems.length})
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-agri-800 bg-agri-100 hover:bg-agri-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {billItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-agri-900 bg-agri-100 px-2 py-0.5 rounded">
                      Item #{idx + 1}
                    </span>
                    {billItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Pre-fill dropdown from catalog */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                      Choose From Catalog (Optional Quick-Fill)
                    </label>
                    <select
                      value={item.item_id || ''}
                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white outline-none"
                    >
                      <option value="">-- Manual Item or Select Product --</option>
                      {itemsList.map((prod) => (
                        <option key={prod.id} value={prod.id}>
                          {prod.name} &bull; {prod.model || 'Std'} ({formatINR(prod.rate)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => updateItemField(idx, 'item_name', e.target.value)}
                        placeholder="e.g. Rotavator / Multicrop Thesher"
                        className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg bg-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Model
                      </label>
                      <input
                        type="text"
                        value={item.model}
                        onChange={(e) => updateItemField(idx, 'model', e.target.value)}
                        placeholder="e.g. MRT SM02"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Capacity
                      </label>
                      <input
                        type="text"
                        value={item.capacity}
                        onChange={(e) => updateItemField(idx, 'capacity', e.target.value)}
                        placeholder="e.g. HP35+ / Above 4 Tonne"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        S.R. No.
                      </label>
                      <input
                        type="text"
                        value={item.serial_no}
                        onChange={(e) => updateItemField(idx, 'serial_no', e.target.value)}
                        placeholder="e.g. 4998 / 1197"
                        className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Unique Code
                      </label>
                      <input
                        type="text"
                        value={item.unique_code}
                        onChange={(e) => updateItemField(idx, 'unique_code', e.target.value)}
                        placeholder="e.g. GJ/7050/445/2026/4998"
                        className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        MF Year
                      </label>
                      <input
                        type="text"
                        value={item.mf_year}
                        onChange={(e) => updateItemField(idx, 'mf_year', e.target.value)}
                        placeholder="e.g. 2025-26"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        value={item.company}
                        onChange={(e) => updateItemField(idx, 'company', e.target.value)}
                        placeholder="e.g. METALTEC PRODUCTS"
                        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        HSN/SAC Code
                      </label>
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) => updateItemField(idx, 'hsn_code', e.target.value)}
                        placeholder="e.g. 84328020"
                        className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItemField(idx, 'qty', e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-300 rounded-lg bg-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        Rate (₹) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItemField(idx, 'rate', e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-300 rounded-lg bg-white outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                        {taxType === 'intra_state' ? 'SGST / CGST %' : 'IGST %'}
                      </label>
                      {taxType === 'intra_state' ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.sgst_pct}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateItemField(idx, 'sgst_pct', val);
                              updateItemField(idx, 'cgst_pct', val);
                            }}
                            className="w-full px-2 py-2 text-xs font-mono border border-neutral-300 rounded-lg bg-white outline-none text-center"
                          />
                          <span className="text-xs text-neutral-400 font-bold">+</span>
                          <input
                            type="number"
                            value={item.cgst_pct}
                            onChange={(e) => updateItemField(idx, 'cgst_pct', e.target.value)}
                            className="w-full px-2 py-2 text-xs font-mono border border-neutral-300 rounded-lg bg-white outline-none text-center"
                          />
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={item.igst_pct}
                          onChange={(e) => updateItemField(idx, 'igst_pct', e.target.value)}
                          className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg bg-white outline-none text-center"
                        />
                      )}
                    </div>
                  </div>

                  {/* Multi-line Description Preview/Editor */}
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                      Invoice Description (Multi-line layout printed on invoice)
                    </label>
                    <textarea
                      rows="4"
                      value={item.description_text}
                      onChange={(e) => updateItemField(idx, 'description_text', e.target.value)}
                      placeholder="Custom multi-line description..."
                      className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg bg-white outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. TOTALS, CHARGES & PAYMENTS */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-3">
              Totals & Payment Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Other Additions / Charges (Ot. Add.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Round Off (R.OFF)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={roundOff}
                  onChange={(e) => setRoundOff(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Calculations Summary Box */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
              <div className="flex justify-between font-medium text-neutral-600">
                <span>Subtotal (TOTAL):</span>
                <span className="font-mono">{formatINR(subtotal)}</span>
              </div>
              {taxType === 'intra_state' ? (
                <>
                  <div className="flex justify-between font-medium text-neutral-600">
                    <span>SGST:</span>
                    <span className="font-mono">{formatINR(totalSGST)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-neutral-600">
                    <span>CGST:</span>
                    <span className="font-mono">{formatINR(totalCGST)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-medium text-neutral-600">
                  <span>IGST:</span>
                  <span className="font-mono">{formatINR(totalIGST)}</span>
                </div>
              )}
              {otherNum > 0 && (
                <div className="flex justify-between font-medium text-neutral-600">
                  <span>Other Additions:</span>
                  <span className="font-mono">+{formatINR(otherNum)}</span>
                </div>
              )}
              {discNum > 0 && (
                <div className="flex justify-between font-medium text-neutral-600">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatINR(discNum)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg text-agri-950 pt-2 border-t border-neutral-300">
                <span>Net Total:</span>
                <span className="font-mono">{formatINR(netTotal)}</span>
              </div>
              <div className="text-xs font-semibold text-neutral-600 pt-1 border-t border-neutral-200">
                Amount in Words: <span className="text-neutral-900 font-serif italic">{amountWords}</span>
              </div>
            </div>

            {/* Invoice Notes */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Internal Remarks / Delivery Notes
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered via tractor trolley, 50% advance received..."
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>
          </div>
        </div>

        {/* Live A4 Preview Pane (If Active) */}
        {showLivePreview && (
          <div className="lg:col-span-6 sticky top-20 max-h-[85vh] overflow-y-auto bg-neutral-100 p-4 rounded-2xl border border-neutral-300 shadow-inner">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                Live A4 Invoice Preview
              </span>
              <span className="text-[11px] text-neutral-400">
                Instant WYSIWYG
              </span>
            </div>
            <TaxInvoiceA4 bill={previewBill} isPreview={true} />
          </div>
        )}
      </div>
    </div>
  );
}
