import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BadgeDollarSign, 
  FileText, 
  Map, 
  Wallet, 
  Database,
  Users,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';

export type ActiveModule = 'dashboard' | 'cobranzas' | 'ventas' | 'lotes' | 'caja' | 'usuarios' | 'auditoria' | 'configuracion';

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { cobranzas, lotes, metrics, usuarios, pagos } = useData();
  const { user, canAccessFinanzas, canAccessUsuarios } = useAuth();
  const { empresaConfig } = useCompany();

  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ecosol_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('ecosol_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const allNavItems = [
    {
      id: 'dashboard' as ActiveModule,
      label: 'Dashboard Financiero',
      icon: LayoutDashboard,
      badge: null,
      visible: true
    },
    {
      id: 'cobranzas' as ActiveModule,
      label: 'Control de Cobranzas',
      icon: BadgeDollarSign,
      badge: `${cobranzas.length}`,
      visible: true
    },
    {
      id: 'ventas' as ActiveModule,
      label: 'Ventas y Contratos',
      icon: FileText,
      badge: null,
      visible: true
    },
    {
      id: 'lotes' as ActiveModule,
      label: 'Inventario de Lotes',
      icon: Map,
      badge: `${lotes.length}`,
      visible: true
    },
    {
      id: 'caja' as ActiveModule,
      label: 'Caja & Flujo de Fondos',
      icon: Wallet,
      badge: `${pagos.length}`,
      visible: !user || canAccessFinanzas
    },
    {
      id: 'usuarios' as ActiveModule,
      label: 'Gestión de Usuarios',
      icon: Users,
      badge: `${usuarios.length}`,
      visible: !user || canAccessUsuarios
    },
    {
      id: 'auditoria' as ActiveModule,
      label: 'Explorador BD',
      icon: Database,
      badge: 'SQL',
      visible: !user || user?.rol === 'Administrador' || user?.rol === 'Cobranzas / Caja'
    },
    {
      id: 'configuracion' as ActiveModule,
      label: 'Configuración Empresa',
      icon: Settings,
      badge: null,
      visible: true
    }
  ];

  const navItems = allNavItems.filter(item => item.visible);

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 select-none shrink-0 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className={`border-b border-slate-100 transition-all duration-300 ${
          isCollapsed 
            ? 'p-3 flex flex-col items-center justify-center gap-2' 
            : 'p-4 px-5 flex items-center justify-between gap-3'
        }`}>
          {/* Logo & Brand text */}
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            {/* Pure logo without green background box */}
            <div className="flex items-center justify-center shrink-0">
              {empresaConfig.logoUrl ? (
                <img 
                  src={empresaConfig.logoUrl} 
                  alt={empresaConfig.nombreEmpresa} 
                  className={`object-contain transition-all duration-200 ${
                    isCollapsed ? 'h-8 w-auto max-w-[36px]' : 'h-9 w-auto max-w-[42px]'
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className={`${isCollapsed ? 'w-6 h-6' : 'w-7 h-7'} text-emerald-600`} />
              )}
            </div>

            {/* Brand Title (hidden when collapsed) */}
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-slate-900 text-sm truncate">
                    {empresaConfig.nombreEmpresa.split(' ')[0] || 'ECOSOL'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                    ERP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal truncate">
                  {empresaConfig.nombreEmpresa.split(' ').slice(1).join(' ') || 'INMOBILIARIA'}
                </p>
              </div>
            )}
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expandir barra lateral' : 'Ocultar barra lateral'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <div className={`py-3 space-y-1 ${isCollapsed ? 'px-2' : 'p-3'}`}>
          {!isCollapsed && (
            <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Menú Principal
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            if (isCollapsed) {
              return (
                <div key={item.id} className="relative group flex justify-center py-0.5">
                  <button
                    onClick={() => setActiveModule(item.id)}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-800 shadow-xs ring-1 ring-emerald-300 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-2 right-2 ring-2 ring-white" />
                    )}
                  </button>

                  {/* Floating Tooltip */}
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap flex items-center gap-1.5 font-medium">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="bg-slate-700 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Snapshot Card at bottom */}
      {isCollapsed ? (
        <div className="p-2 mb-3 flex flex-col items-center justify-center group relative">
          <button
            onClick={() => setActiveModule('cobranzas')}
            className="w-11 h-11 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-colors cursor-pointer relative"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Floating Snapshot Tooltip */}
          <div className="absolute left-full ml-3 bottom-2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl whitespace-nowrap">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Cartera por Cobrar
              </span>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                S/ {metrics.carteraCobrarActiva.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between gap-3 text-[10px] text-slate-300">
                <span>Lotes Vendidos:</span>
                <span className="font-semibold text-white font-mono">
                  {metrics.lotesVendidos} / {metrics.totalLotes}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500">Cartera por Cobrar</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-base font-bold text-slate-900 tracking-tight">
            S/ {metrics.carteraCobrarActiva.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Lotes Vendidos</span>
            <span className="font-semibold text-slate-800 font-mono">
              {metrics.lotesVendidos} / {metrics.totalLotes}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
