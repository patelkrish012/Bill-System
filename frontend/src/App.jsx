import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateBill from './pages/CreateBill';
import EditBill from './pages/EditBill';
import BillDetails from './pages/BillDetails';
import BillList from './pages/BillList';
import CustomerList from './pages/CustomerList';
import ItemList from './pages/ItemList';
import PaymentLedger from './pages/PaymentLedger';
import Reports from './pages/Reports';
import AdminPortal from './pages/AdminPortal';

function ProtectedLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white">
        <div className="w-8 h-8 border-4 border-agri-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedLayout>
                <Navigate to="/dashboard" replace />
              </ProtectedLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/bills/new"
            element={
              <ProtectedLayout>
                <CreateBill />
              </ProtectedLayout>
            }
          />
          <Route
            path="/bills/:id/edit"
            element={
              <ProtectedLayout>
                <EditBill />
              </ProtectedLayout>
            }
          />
          <Route
            path="/bills/:id"
            element={
              <ProtectedLayout>
                <BillDetails />
              </ProtectedLayout>
            }
          />
          <Route
            path="/bills"
            element={
              <ProtectedLayout>
                <BillList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedLayout>
                <CustomerList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/items"
            element={
              <ProtectedLayout>
                <ItemList />
              </ProtectedLayout>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedLayout>
                <PaymentLedger />
              </ProtectedLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedLayout>
                <Reports />
              </ProtectedLayout>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedLayout>
                <AdminRoute>
                  <AdminPortal />
                </AdminRoute>
              </ProtectedLayout>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
