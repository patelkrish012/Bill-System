import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, User, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotModal, setForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 agri-bg-pattern relative overflow-hidden">
      {/* Decorative gradient glowing accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Business Branding */}
        <div className="text-center">
          <div className="inline-flex p-3.5 bg-white rounded-2xl shadow-xl border border-neutral-200 mb-4 hover:shadow-2xl transition-shadow">
            <img
              src="/krish_logo_transparent.png"
              alt="KRISH AGRICULTURE LOGO"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase font-serif">
            <span className="text-[#0f2942]">KRISH </span>
            <span className="text-[#2e7d32]">AGRICULTURE</span>
          </h2>
          <p className="mt-1.5 text-xs font-extrabold tracking-widest text-[#2e7d32] uppercase">
            SALES | SERVICE | SPARE PARTS
          </p>
          <p className="text-xs font-semibold text-neutral-600 mt-1">
            Tax Invoice & Business Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-neutral-100">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Username or Email
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 focus:border-agri-600 outline-none text-neutral-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-agri-600 focus:border-agri-600 outline-none text-neutral-900"
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

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-neutral-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-agri-700 rounded border-neutral-300 focus:ring-agri-600"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setForgotModal(true)}
                className="font-semibold text-agri-800 hover:text-agri-950 underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-agri-700 hover:bg-agri-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-agri-600 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign in to Krish Agriculture'}
            </button>
          </form>
        </div>

        {/* GSTIN footer */}
        <div className="text-center mt-6 text-xs text-neutral-500">
          GSTIN: <span className="font-mono text-neutral-700 font-bold">24AVCPP4549E1ZN</span>
          <div className="mt-1">Daramali, Himatnagar, Gujarat</div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
            <Shield className="w-10 h-10 text-agri-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-neutral-900">Reset Password</h3>
            <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
              If you have forgotten your password or need a new one, please contact your <strong>Administrator</strong>. The Admin can reset or assign any password directly from the <strong>Admin Portal &gt; User Management</strong> section.
            </p>
            <button
              onClick={() => setForgotModal(false)}
              className="mt-5 w-full py-2.5 bg-agri-700 text-white rounded-lg text-xs font-bold hover:bg-agri-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
