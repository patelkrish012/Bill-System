import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, LogOut, Shield, Menu, KeyRound, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { authAPI } from '../../services/api';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Change Password Modal State
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleOpenPwdModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwdError('');
    setPwdSuccess('');
    setPwdModalOpen(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('All fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.');
      return;
    }

    try {
      setPwdLoading(true);
      await authAPI.changePassword({ currentPassword, newPassword });
      setPwdSuccess('Password changed successfully! You can now use your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPwdModalOpen(false);
      }, 2000);
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Failed to update password: ' + err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <>
      <header className="print:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Mobile Menu Toggle & Brand */}
            <div className="flex items-center gap-3">
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link to="/dashboard" className="flex items-center gap-3 group">
                <img
                  src="/krish_logo.png"
                  alt="KRISH AGRICULTURE"
                  className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
                />
                <div className="hidden sm:block">
                  <div className="text-base font-black tracking-tight leading-none">
                    <span className="text-[#0f2942]">KRISH </span>
                    <span className="text-[#2e7d32]">AGRICULTURE</span>
                  </div>
                  <div className="text-[10px] font-extrabold tracking-widest text-[#2e7d32] uppercase mt-0.5">
                    SALES | SERVICE | SPARE PARTS
                  </div>
                </div>
              </Link>
            </div>

            {/* Right: Actions & User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/bills/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all hover:shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Create New Bill</span>
                <span className="sm:hidden">New</span>
              </Link>

              {/* User Profile Badge */}
              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-neutral-200">
                <div className="w-8 h-8 rounded-full bg-agri-100 border border-agri-300 flex items-center justify-center text-agri-800 font-bold text-xs">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-neutral-900 leading-none">
                    {user?.full_name || 'User'}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 uppercase tracking-wider">
                        <Shield className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider">
                        Staff
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Password Button */}
              <button
                onClick={handleOpenPwdModal}
                title="Change Password"
                className="flex items-center gap-1 p-2 text-neutral-600 hover:text-agri-800 hover:bg-agri-50 rounded-lg transition-colors text-xs font-semibold"
              >
                <KeyRound className="w-4 h-4 text-agri-700" />
                <span className="hidden xl:inline">Password</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-neutral-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative border border-neutral-100">
            <button
              onClick={() => setPwdModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-agri-100 text-agri-800 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Change Your Password</h3>
                <p className="text-xs text-neutral-500">
                  Logged in as: <strong className="text-neutral-700">{user?.username}</strong> ({user?.full_name})
                </p>
              </div>
            </div>

            {pwdSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            {pwdError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{pwdError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none pr-10 focus:ring-2 focus:ring-agri-600 focus:border-agri-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none pr-10 focus:ring-2 focus:ring-agri-600 focus:border-agri-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg outline-none focus:ring-2 focus:ring-agri-600 focus:border-agri-600"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPwdModalOpen(false)}
                  className="w-1/2 py-2.5 border border-neutral-300 text-neutral-700 font-bold text-xs rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="w-1/2 py-2.5 bg-agri-700 hover:bg-agri-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
