import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { RolUsuario } from '../../types/database';
import { 
  Database, 
  RefreshCw, 
  LogOut, 
  ShieldCheck, 
  User, 
  ChevronDown,
  Download
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const { connectionStatus, refreshData, loading } = useData();
  const { isInstalled, installApp } = usePwaInstall();

  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const availableRoles: RolUsuario[] = ['Administrador', 'Cobranzas / Caja', 'Asesor de Ventas'];

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left side: System status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold">Sistema en Línea</span>
          <span className="text-emerald-400">•</span>
          <span className="text-emerald-700 font-normal">{connectionStatus.totalRecords} contratos sincronizados</span>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => refreshData()}
          disabled={loading}
          title="Actualizar datos"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Right side: Role selector, User, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* PWA Install Button */}
        {!isInstalled && (
          <button
            onClick={installApp}
            title="Instalar sistema ECOSOL en tu computadora o escritorio"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-emerald-800 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Instalar App</span>
          </button>
        )}

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">{user?.rol || 'Administrador'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-1 w-52 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 text-xs">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Cambiar Rol (RBAC)
              </div>
              {availableRoles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchRole(r);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    user?.rol === r ? 'text-emerald-700 font-semibold bg-emerald-50/60' : 'text-slate-700'
                  }`}
                >
                  <span>{r}</span>
                  {user?.rol === r && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-semibold text-xs overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.nombres} className="w-full h-full object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-slate-600" />
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.nombres?.split(' ')[0] || 'Admin'}
            </p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

