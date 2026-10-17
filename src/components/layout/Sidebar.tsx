import React from 'react';
import { 
  LayoutDashboard, 
  BadgeDollarSign, 
  FileText, 
  Map, 
  Wallet, 
  Database,
  Users,
  Building2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export type ActiveModule = 'dashboard' | 'cobranzas' | 'ventas' | 'lotes' | 'caja' | 'usuarios' | 'auditoria';

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (m: ActiveModule) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { cobranzas, lotes, metrics, usuarios } = useData();
  const { user, canAccessFinanzas, canAccessUsuarios } = useAuth();

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
      label: 'Caja Chica & Egresos',
      icon: Wallet,
      badge: null,
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
    }
  ];

  const navItems = allNavItems.filter(item => item.visible);

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 select-none shrink-0 z-20">
      <div>
        {/* Brand Header */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center p-1 shadow-xs">
            <img 
              src="/ecosol-logo.png" 
              alt="ECOSOL" 
              className="w-full h-full object-cover rounded"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Building2 className="w-5 h-5 text-white hidden" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-slate-900 text-sm">ECOSOL</span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal">
              Inmobiliaria &amp; Cobranzas
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menú Principal
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

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
    </aside>
  );
};
