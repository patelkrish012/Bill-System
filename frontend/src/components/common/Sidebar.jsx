import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  Shield,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Create New Bill', path: '/bills/new', icon: FilePlus },
    { name: 'Bills / Invoices', path: '/bills', icon: FileText },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Items / Products', path: '/items', icon: Package },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const adminItems = [
    { name: 'Admin Portal & Settings', path: '/admin', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`print:hidden fixed lg:sticky top-0 lg:top-16 left-0 z-40 h-full lg:h-[calc(100vh-4rem)] w-64 bg-white border-r border-neutral-200 shadow-sm flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 overflow-y-auto">
          {/* Mobile close header */}
          <div className="flex lg:hidden items-center justify-between pb-4 mb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <img src="/krish_logo.png" alt="Logo" className="h-8 w-auto" />
              <span className="font-bold text-sm text-neutral-900">Krish Agriculture</span>
            </div>
            <button onClick={onClose} className="p-1 rounded text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation links */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-2">
              Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-agri-700 text-white shadow-sm'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-agri-800'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Admin section */}
          {isAdmin && (
            <div className="mt-6 pt-4 border-t border-neutral-200 space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1 mb-2">
                <Shield className="w-3 h-3" />
                <span>Admin Portal</span>
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-navy-900 text-white shadow-sm'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-navy-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-neutral-100 text-[11px] text-neutral-500 bg-neutral-50">
          <div className="font-bold text-neutral-800">Krish Agriculture</div>
          <div>Daramali, Sabarkantha</div>
          <div className="font-mono text-[10px] text-neutral-400 mt-1">GSTIN: 24AVCPP4549E1ZN</div>
        </div>
      </aside>
    </>
  );
}
