import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billsAPI, itemsAPI } from '../services/api';
import { formatINR, numberToIndianWords, toInputDate } from '../utils/formatters';
import TaxInvoiceA4 from '../components/invoice/TaxInvoiceA4';
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  Eye,
  Package,
  User,
  Calculator
} from 'lucide-react';

export default function EditBill() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [bill, setBill] = useState(null);
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [inputDate, setInputDate] = useState('');

  // Customer State
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [customerTaluka, setCustomerTaluka] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [customerState, setCustomerState] = useState('Gujarat');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');

  // Tax and Calculation State
  const [taxType, setTaxType] = useState('intra_state');
  const [itemsList, setItemsList] = useState([]);
  const [billItems, setBillItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [notes, setNotes] = useState('');

  const [showLivePreview, setShowLivePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchBill() {
      try {
        setLoading(true);
        const [billRes, itemRes] = await Promise.all([
          billsAPI.getById(id),
          itemsAPI.getAll()
        ]);

        const b = billRes.data;
        setBill(b);
        setBillNumber(b.bill_number);
        setBillDate(b.bill_date);
        setInputDate(toInputDate(b.bill_date));

        setCustomerName(b.customer_name || '');
        setCustomerAddress(b.customer_address || '');
        setCustomerVillage(b.customer_village || '');
        setCustomerTaluka(b.customer_taluka || '');
        setCustomerDistrict(b.customer_district || '');
        setCustomerState(b.customer_state || 'Gujarat');
        setCustomerMobile(b.customer_mobile || '');
        setCustomerGSTIN(b.customer_gstin || '');

        setTaxType(b.tax_type || 'intra_state');
        setDiscount(b.discount_amount || 0);
        setOtherCharges(b.other_charges || 0);
        setRoundOff(b.round_off || 0);
        setNotes(b.notes || '');

        if (b.items && b.items.length > 0) {
          setBillItems(b.items.map(item => ({
            ...item,
            qty: item.qty || 1,
            rate: item.rate || 0,
            sgst_pct: item.sgst_pct !== undefined ? item.sgst_pct : 6,
            cgst_pct: item.cgst_pct !== undefined ? item.cgst_pct : 6,
            igst_pct: item.igst_pct !== undefined ? item.igst_pct : 12,
          })));
        } else {
          setBillItems([{
            item_name: 'Item',
            model: '',
            capacity: '',
            serial_no: '',
            unique_code: '',
            mf_year: '',
            company: '',
            hsn_code: '',
            description_text: '',
            qty: 1,
            rate: 0,
            sgst_pct: 6,
            cgst_pct: 6,
            igst_pct: 12
          }]);
        }

        setItemsList(itemRes.data);
      } catch (err) {
        setError('Failed to load bill: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [id]);

  const handleDateChange = (e) => {
    const val = e.target.value;
    setInputDate(val);
    const [y, m, d] = val.split('-');
    setBillDate(`${d}/${m}/${y}`);
  };

  const handleItemSelect = (index, itemId) => {
    const found = itemsList.find(i => String(i.id) === String(itemId));
    const updated = [...billItems];

    if (found) {
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
    }
    setBillItems(updated);
  };

  const updateItemField = (index, field, value) => {
    const updated = [...billItems];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-rebuild description_text when key fields change
    const descFields = ['item_name', 'model', 'capacity', 'serial_no', 'unique_code', 'mf_year', 'company', 'hsn_code'];
    if (descFields.includes(field)) {
      const item = updated[index];
      const name = field === 'item_name' ? value : item.item_name;
      const model = field === 'model' ? value : item.model;
      const capacity = field === 'capacity' ? value : item.capacity;
      const serial_no = field === 'serial_no' ? value : item.serial_no;
      const unique_code = field === 'unique_code' ? value : item.unique_code;
      const mf_year = field === 'mf_year' ? value : item.mf_year;
      const company = field === 'company' ? value : item.company;
      const hsn_code = field === 'hsn_code' ? value : item.hsn_code;

      const descLines = [];
      if (model) descLines.push(`${name} Model:\n${model}`);
      else if (name) descLines.push(name);
      if (capacity) descLines.push(`CAPACITY:\n${capacity}`);
      if (serial_no) descLines.push(`SR.NO:\n${serial_no}`);
      if (unique_code) descLines.push(`UNIQ.CODE:\n${unique_code}`);
      if (mf_year) descLines.push(`MF, YEAR:\n${mf_year}`);
      if (company) descLines.push(`Company:\n${company}`);
      if (hsn_code) descLines.push(`HSN Code:-${hsn_code}`);

      updated[index].description_text = descLines.join('\n');
    }

    setBillItems(updated);
  };

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

  const removeItemRow = (index) => {
    if (billItems.length === 1) {
      alert('A bill must contain at least one item.');
      return;
    }
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  // Recalculations
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

  const previewBill = bill ? {
    ...bill,
    bill_number: billNumber,
    bill_date: billDate,
    customer_name: customerName,
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
    items: billItems.map(item => ({
      ...item,
      total_amount: (Number(item.qty) || 0) * (Number(item.rate) || 0)
    }))
  } : null;

  const handleUpdate = async () => {
    if (!customerName.trim()) {
      setError('Please enter customer name.');
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
        notes: notes.trim()
      };

      await billsAPI.update(id, payload);
      navigate(`/bills/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update bill: ' + err.message);
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
            onClick={() => navigate(`/bills/${id}`)}
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight">
              Edit Tax Invoice #{bill?.bill_number}
            </h1>
            <p className="text-xs text-neutral-500">
              Modifying existing invoice with audit tracking
            </p>
          </div>
        </div>

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
            onClick={handleUpdate}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 shadow-md hover:shadow transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className={`grid grid-cols-1 ${showLivePreview ? 'lg:grid-cols-12 gap-6' : ''}`}>
        <div className={`${showLivePreview ? 'lg:col-span-6' : 'w-full'} space-y-6`}>
          {/* Invoice ID Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-agri-700" />
              Invoice Meta
            </h3>

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
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Bill Date *
                </label>
                <input
                  type="date"
                  value={inputDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 outline-none"
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

          {/* Customer Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-agri-700" />
              Customer Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-neutral-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Village
                </label>
                <input
                  type="text"
                  value={customerVillage}
                  onChange={(e) => setCustomerVillage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Taluka
                </label>
                <input
                  type="text"
                  value={customerTaluka}
                  onChange={(e) => setCustomerTaluka(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={customerDistrict}
                  onChange={(e) => setCustomerDistrict(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
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
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Customer GSTIN
                </label>
                <input
                  type="text"
                  value={customerGSTIN}
                  onChange={(e) => setCustomerGSTIN(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          {/* Items Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-agri-700" />
                Invoice Products ({billItems.length})
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
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
                        className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg bg-white outline-none"
                        required
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
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 uppercase mb-1">
                      Description Text
                    </label>
                    <textarea
                      rows="4"
                      value={item.description_text}
                      onChange={(e) => updateItemField(idx, 'description_text', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg bg-white outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider border-b border-neutral-100 pb-3">
              Adjustments & Totals
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
                  Other Additions (Ot. Add.)
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

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-sm">
              <div className="flex justify-between font-medium text-neutral-600">
                <span>Subtotal (TOTAL):</span>
                <span className="font-mono">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between font-black text-lg text-agri-950 pt-2 border-t border-neutral-300">
                <span>Recalculated Net Total:</span>
                <span className="font-mono">{formatINR(netTotal)}</span>
              </div>
              <div className="text-xs font-semibold text-neutral-600 pt-1 border-t border-neutral-200">
                Amount in Words: <span className="text-neutral-900 font-serif italic">{amountWords}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        {showLivePreview && previewBill && (
          <div className="lg:col-span-6 sticky top-20 max-h-[85vh] overflow-y-auto bg-neutral-100 p-4 rounded-2xl border border-neutral-300 shadow-inner">
            <TaxInvoiceA4 bill={previewBill} isPreview={true} />
          </div>
        )}
      </div>
    </div>
  );
}
