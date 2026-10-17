import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithEmail, loginAsDemo, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginWithEmail(email, password);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/35 backdrop-blur-[3.5px] animate-fadeIn">
      {/* Login Card */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white mb-3 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            ECOSOL INMOBILIARIA
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ERP &amp; Gestión de Cobranzas
          </p>

          <div className="mt-2.5 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Supabase PostgreSQL Live
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Quick Demo Access Button */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-center">
          <p className="text-[11px] text-slate-600 mb-2 font-medium">
            Acceso Rápido para Auditoría y Evaluación
          </p>
          <button
            type="button"
            onClick={() => loginAsDemo('Administrador')}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingresar como Administrador (Demo)</span>
          </button>
          
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => loginAsDemo('Cobranzas / Caja')}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200 transition-colors text-center cursor-pointer"
            >
              Demo Cobranzas
            </button>
            <button
              type="button"
              onClick={() => loginAsDemo('Asesor de Ventas')}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200 transition-colors text-center cursor-pointer"
            >
              Demo Asesor
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2.5 text-slate-400 font-medium">
              O con correo electrónico
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                placeholder="usuario@ecosol.pe"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs mt-1"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>PostgreSQL v15</span>
          <span>ECOSOL ERP v3.0</span>
        </div>
      </div>
    </div>
  );
};
