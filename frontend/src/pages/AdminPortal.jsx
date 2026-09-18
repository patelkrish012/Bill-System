import React, { useState, useEffect } from 'react';
import { settingsAPI, usersAPI, backupAPI } from '../services/api';
import Modal from '../components/common/Modal';
import {
  Settings,
  Building,
  CreditCard,
  FileCheck,
  Users,
  Database,
  History,
  Save,
  Plus,
  Edit,
  Trash2,
  Download,
  Shield,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('business');
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [error, setError] = useState('');

  // Business Form
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    tagline: '',
    gstin: '',
    mobile: '',
    email: '',
    address: '',
    starting_bill_no: 41
  });

  // Bank Modal
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_holder: 'KRISH AGRICULTURE',
    account_number: '',
    ifsc_code: '',
    branch: '',
    upi_id: '',
    is_default: 1
  });

  // Term Modal
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termText, setTermText] = useState('');

  // User Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'user'
  });

  // Reset User Password Modal
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [setRes, userRes, logRes] = await Promise.all([
        settingsAPI.getSettings(),
        usersAPI.getAll(),
        backupAPI.getAuditLogs({ limit: 50 })
      ]);

      setSettings(setRes.data);
      if (setRes.data.business) {
        setBusinessForm({
          business_name: setRes.data.business.business_name || 'KRISH AGRICULTURE',
          tagline: setRes.data.business.tagline || 'SALES | SERVICE | SPARE PARTS',
          gstin: setRes.data.business.gstin || '24AVCPP4549E1ZN',
          mobile: setRes.data.business.mobile || '94297 62695',
          email: setRes.data.business.email || 'krishagriculturehmt@gmail.com',
          address: setRes.data.business.address || 'Gelexy Plaza, Idar himatnagar Highway Road, Daramali -383110. S.K. (Guj.)',
          starting_bill_no: setRes.data.business.starting_bill_no || 41
        });
      }

      setUsers(userRes.data);
      setAuditLogs(logRes.data);
    } catch (err) {
      setError('Failed to load admin settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update Business Info
  const handleUpdateBusiness = async (e) => {
    e.preventDefault();
    try {
      setSaveSuccess('');
      setError('');
      await settingsAPI.updateBusiness(businessForm);
      setSaveSuccess('Business settings & GSTIN updated successfully! Future invoices will use these settings.');
      setTimeout(() => setSaveSuccess(''), 4000);
      loadAllData();
    } catch (err) {
      setError('Failed to update business settings: ' + err.message);
    }
  };

  // Bank Actions
  const handleSaveBank = async (e) => {
    e.preventDefault();
    try {
      if (editingBank) {
        await settingsAPI.updateBank(editingBank.id, bankForm);
      } else {
        await settingsAPI.addBank(bankForm);
      }
      setBankModalOpen(false);
      loadAllData();
    } catch (err) {
      alert('Error saving bank: ' + err.message);
    }
  };

  const handleDeleteBank = async (id) => {
    if (!window.confirm('Delete this bank account?')) return;
    try {
      await settingsAPI.deleteBank(id);
      loadAllData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Terms Actions
  const handleSaveTerm = async (e) => {
    e.preventDefault();
    if (!termText.trim()) return;
    try {
      if (editingTerm) {
        await settingsAPI.updateTerm(editingTerm.id, { term_text: termText.trim() });
      } else {
        await settingsAPI.addTerm({ term_text: termText.trim() });
      }
      setTermModalOpen(false);
      loadAllData();
    } catch (err) {
      alert('Error saving term: ' + err.message);
    }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm('Remove this condition clause?')) return;
    try {
      await settingsAPI.deleteTerm(id);
      loadAllData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // User Actions
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.create(userForm);
      setUserModalOpen(false);
      setUserForm({ username: '', email: '', password: '', full_name: '', role: 'user' });
      loadAllData();
    } catch (err) {
      alert('Error creating user: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeactivateUser = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await usersAPI.delete(id);
      loadAllData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleOpenResetPwd = (user) => {
    setTargetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setResetPwdModalOpen(true);
  };

  const handleResetUserPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    try {
      setResetLoading(true);
      await usersAPI.update(targetUser.id, { password: newPassword });
      setResetPwdModalOpen(false);
      setSaveSuccess(`Password for user '${targetUser.username}' (${targetUser.full_name}) has been updated successfully!`);
      setTimeout(() => setSaveSuccess(''), 4000);
      loadAllData();
    } catch (err) {
      alert('Error updating password: ' + (err.response?.data?.error || err.message));
    } finally {
      setResetLoading(false);
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
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 font-serif uppercase tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-600" />
            Admin Portal & Business Configuration
          </h1>
          <p className="text-xs text-neutral-500">
            Configure GSTIN, Bank Accounts, Terms & Conditions, System Users, and Data Backups
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 overflow-x-auto">
        {[
          { id: 'business', name: 'Business Info & GSTIN', icon: Building },
          { id: 'bank', name: 'Bank Details', icon: CreditCard },
          { id: 'terms', name: 'Terms & Conditions', icon: FileCheck },
          { id: 'users', name: 'User Management', icon: Users },
          { id: 'backup', name: 'Backup & Export', icon: Database },
          { id: 'audit', name: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* 1. BUSINESS SETTINGS & GSTIN */}
      {activeTab === 'business' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <strong>Historical Snapshot Rule:</strong> Updating business details or GSTIN here will apply automatically to all <em>new</em> bills. Previous bills already generated retain their historical snapshot data to preserve accurate audit records.
          </div>

          <form onSubmit={handleUpdateBusiness} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-bold border border-neutral-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Business Tagline
                </label>
                <input
                  type="text"
                  value={businessForm.tagline}
                  onChange={(e) => setBusinessForm({ ...businessForm, tagline: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Primary Business GSTIN *
                </label>
                <input
                  type="text"
                  value={businessForm.gstin}
                  onChange={(e) => setBusinessForm({ ...businessForm, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-neutral-300 rounded-lg outline-none bg-neutral-50"
                  required
                />
                <span className="text-[11px] text-neutral-500">
                  Default: <strong>24AVCPP4549E1ZN</strong> (Displayed in header of all invoices)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Business Mobile Number
                </label>
                <input
                  type="text"
                  value={businessForm.mobile}
                  onChange={(e) => setBusinessForm({ ...businessForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={businessForm.email}
                  onChange={(e) => setBusinessForm({ ...businessForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Starting Bill Number
                </label>
                <input
                  type="number"
                  value={businessForm.starting_bill_no}
                  onChange={(e) => setBusinessForm({ ...businessForm, starting_bill_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-neutral-300 rounded-lg outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                  Business Address (Printed on Banner)
                </label>
                <input
                  type="text"
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none"
                />
              </div>
            </div>

            {/* Official Logo Display */}
            <div className="pt-4 border-t border-neutral-200">
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">
                Active Business Logo (Unmodified Original)
              </label>
              <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div className="p-2 bg-white rounded-lg border border-neutral-300">
                  <img
                    src="/krish_logo.png"
                    alt="Krish Agriculture Logo"
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <div className="text-xs text-neutral-600 space-y-1">
                  <div className="font-bold text-neutral-900">Extracted KA Winged Emblem</div>
                  <div>Used across Login, Dashboard, PDF, and Browser Print.</div>
                  <div className="text-[11px] text-neutral-400 font-mono">Location: /krish_logo.png</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Business Information</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. BANK DETAILS */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Saved Bank Accounts</h3>
              <p className="text-xs text-neutral-500">
                These bank details automatically attach to new invoices for customer payments
              </p>
            </div>
            <button
              onClick={() => {
                setEditingBank(null);
                setBankForm({
                  bank_name: '',
                  account_holder: 'KRISH AGRICULTURE',
                  account_number: '',
                  ifsc_code: '',
                  branch: '',
                  upi_id: '',
                  is_default: 1
                });
                setBankModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bank Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings?.banks?.map((bank) => (
              <div key={bank.id} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs relative">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-neutral-900">{bank.bank_name}</h4>
                  {bank.is_default ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                      Default On Invoices
                    </span>
                  ) : null}
                </div>

                <div className="text-xs text-neutral-700 space-y-1 font-mono">
                  <div>Holder: <strong className="font-sans text-neutral-900">{bank.account_holder}</strong></div>
                  <div>A/C No: <strong>{bank.account_number}</strong></div>
                  <div>IFSC: <strong>{bank.ifsc_code}</strong></div>
                  {bank.branch && <div>Branch: {bank.branch}</div>}
                  {bank.upi_id && <div>UPI ID: <strong>{bank.upi_id}</strong></div>}
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      setEditingBank(bank);
                      setBankForm(bank);
                      setBankModalOpen(true);
                    }}
                    className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBank(bank.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TERMS & CONDITIONS */}
      {activeTab === 'terms' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Standard Terms & Conditions</h3>
              <p className="text-xs text-neutral-500">
                Clauses automatically printed in the bottom-left section of every A4 invoice
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTerm(null);
                setTermText('');
                setTermModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Add Condition Clause</span>
            </button>
          </div>

          <div className="divide-y divide-neutral-100">
            {settings?.terms?.map((term, idx) => (
              <div key={term.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-neutral-400">{idx + 1}.</span>
                  <span className="font-medium text-neutral-800">{term.term_text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTerm(term);
                      setTermText(term.term_text);
                      setTermModalOpen(true);
                    }}
                    className="p-1.5 text-neutral-600 hover:text-blue-700 hover:bg-neutral-100 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTerm(term.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Application Users & Roles</h3>
              <p className="text-xs text-neutral-500">
                Grant Admin privileges or Staff bill-creation permissions
              </p>
            </div>
            <button
              onClick={() => setUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create New User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 uppercase font-bold text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-4">Username</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-bold text-neutral-900">{u.full_name}</td>
                    <td className="py-3 px-4 font-mono">{u.username}</td>
                    <td className="py-3 px-4">{u.email || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-900' : 'bg-neutral-100 text-neutral-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={u.is_active ? 'text-emerald-700 font-bold' : 'text-neutral-400'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenResetPwd(u)}
                        className="inline-flex items-center gap-1 text-agri-700 hover:text-agri-900 font-bold bg-agri-50 hover:bg-agri-100 px-2.5 py-1 rounded-lg transition-colors"
                        title="Set or reset password for this user"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Set Password</span>
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeactivateUser(u.id)}
                          className="text-red-600 hover:text-red-800 font-bold px-2 py-1"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BACKUP & EXPORT */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Database Backup & Export Center</h3>
            <p className="text-xs text-neutral-500">
              Export complete business invoices, customers, and product catalogs to CSV or JSON formats
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 mb-1">Full System Database Backup (JSON)</h4>
                <p className="text-xs text-neutral-600">
                  Contains all tables: bills, bill items, payments, business settings, bank details, customers, products, and audit logs.
                </p>
              </div>
              <a
                href={backupAPI.exportJsonUrl}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete JSON Backup</span>
              </a>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 mb-1">Invoices Spreadsheet (CSV)</h4>
                <p className="text-xs text-neutral-600">
                  Export all tax invoice records with bill numbers, dates, customer details, GST totals, and payment status for Excel.
                </p>
              </div>
              <a
                href={backupAPI.exportCsvUrl('bills')}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export Bills to CSV</span>
              </a>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 mb-1">Customer Ledger Export (CSV)</h4>
                <p className="text-xs text-neutral-600">
                  Download all registered customer profiles, village, district, mobile numbers, and GSTINs.
                </p>
              </div>
              <a
                href={backupAPI.exportCsvUrl('customers')}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export Customers to CSV</span>
              </a>
            </div>

            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 mb-1">Products & Parts Catalog (CSV)</h4>
                <p className="text-xs text-neutral-600">
                  Download product listings with models, capacities, serial numbers, codes, rates, and HSN codes.
                </p>
              </div>
              <a
                href={backupAPI.exportCsvUrl('items')}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-lg"
              >
                <Download className="w-4 h-4" />
                <span>Export Products to CSV</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">System Activity & Audit Log</h3>
            <p className="text-xs text-neutral-500">
              Live chronological log of invoice creations, updates, deletions, and administrative changes
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 uppercase font-bold text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Details</th>
                  <th className="py-2.5 px-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-400">{log.timestamp}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        log.action === 'create' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'update' ? 'bg-blue-100 text-blue-800' :
                        log.action === 'delete' ? 'bg-rose-100 text-rose-800' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-neutral-700">{log.entity_type}</td>
                    <td className="py-3 px-4 font-medium text-neutral-900">{log.details}</td>
                    <td className="py-3 px-4 font-mono text-neutral-500">{log.username}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bank Account Modal */}
      <Modal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        title={editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
      >
        <form onSubmit={handleSaveBank} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              value={bankForm.bank_name}
              onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
              placeholder="e.g. State Bank of India / Bank of Baroda"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Account Holder Name *
            </label>
            <input
              type="text"
              value={bankForm.account_holder}
              onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Account Number *
            </label>
            <input
              type="text"
              value={bankForm.account_number}
              onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                value={bankForm.ifsc_code}
                onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Branch Name
              </label>
              <input
                type="text"
                value={bankForm.branch}
                onChange={(e) => setBankForm({ ...bankForm, branch: e.target.value })}
                placeholder="e.g. Himatnagar"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              UPI ID
            </label>
            <input
              type="text"
              value={bankForm.upi_id}
              onChange={(e) => setBankForm({ ...bankForm, upi_id: e.target.value })}
              placeholder="e.g. 9429762695@sbi"
              className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={bankForm.is_default === 1}
              onChange={(e) => setBankForm({ ...bankForm, is_default: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-agri-700 rounded"
            />
            <label htmlFor="is_default" className="text-xs text-neutral-700">
              Set as primary default account on invoices
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setBankModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              Save Bank
            </button>
          </div>
        </form>
      </Modal>

      {/* Term Modal */}
      <Modal
        isOpen={termModalOpen}
        onClose={() => setTermModalOpen(false)}
        title={editingTerm ? 'Edit Term Condition' : 'Add Term Clause'}
      >
        <form onSubmit={handleSaveTerm} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Condition Clause Text *
            </label>
            <textarea
              rows="3"
              value={termText}
              onChange={(e) => setTermText(e.target.value)}
              placeholder="e.g. All Disputes Subject to Himatnagar Jurisdiction"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setTermModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              Save Term
            </button>
          </div>
        </form>
      </Modal>

      {/* User Modal */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Add System User"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={userForm.full_name}
              onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
              placeholder="e.g. Amit Patel"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Username *
              </label>
              <input
                type="text"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="e.g. staff2"
                className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-lg outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Role *
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none font-semibold"
              >
                <option value="user">Staff User (Billing only)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Password *
            </label>
            <input
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Email (Optional)
            </label>
            <input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="e.g. user@krishagriculture.com"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg"
            >
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset User Password Modal */}
      <Modal
        isOpen={resetPwdModalOpen}
        onClose={() => setResetPwdModalOpen(false)}
        title={`Set Password for ${targetUser?.username || 'User'}`}
      >
        <form onSubmit={handleResetUserPassword} className="space-y-4">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
            <div className="font-bold text-neutral-800">
              User: <span className="font-mono text-agri-800">{targetUser?.username}</span> ({targetUser?.full_name})
            </div>
            <div className="text-neutral-500 mt-0.5">
              Role: <span className="uppercase font-bold text-neutral-700">{targetUser?.role}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none pr-10 focus:ring-2 focus:ring-agri-600 focus:border-agri-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-agri-600 focus:border-agri-600"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setResetPwdModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={resetLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm disabled:opacity-50"
            >
              {resetLoading ? 'Saving...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
