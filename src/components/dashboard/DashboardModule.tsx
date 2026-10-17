import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../context/ThemeContext';
import { MetodoPago, Pago } from '../../types/database';
import { VoucherModal } from '../common/VoucherModal';
import { 
  DollarSign, 
  TrendingUp, 
  MapPin, 
  Wallet, 
  Receipt,
  ExternalLink,
  PieChart as PieIcon,
  BarChart3,
  Smartphone,
  Building,
  UserPlus,
  FilePlus
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const DashboardModule: React.FC = () => {
  const { 
    metrics, 
    contratos, 
    pagos, 
    egresos,
    lotes, 
    setIsNuevoClienteModalOpen, 
    setIsNuevaVentaModalOpen 
  } = useData();

  const { activeColorTheme } = useTheme();
  const [activeVoucher, setActiveVoucher] = useState<Pago | null>(null);

  // 1. Data for Monthly Inflow vs Outflow Bar Chart computed dynamically from real records
  const monthlyData = useMemo(() => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

    // Group real payments by 'YYYY-MM'
    const incomeByMonth: Record<string, number> = {};
    pagos.forEach(p => {
      if (p.fecha_pago) {
        const ym = p.fecha_pago.slice(0, 7);
        incomeByMonth[ym] = (incomeByMonth[ym] || 0) + Number(p.monto || 0);
      }
    });

    // Group real egresos by 'YYYY-MM'
    const expenseByMonth: Record<string, number> = {};
    egresos.forEach(e => {
      if (e.fecha) {
        const ym = e.fecha.slice(0, 7);
        expenseByMonth[ym] = (expenseByMonth[ym] || 0) + Number(e.monto || 0);
      }
    });

    // Find all distinct months or generate recent 6 months
    const allMonths = Array.from(new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])).sort();
    
    let targetMonths = allMonths.slice(-6);
    if (targetMonths.length === 0) {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        targetMonths.push(ym);
      }
    }

    return targetMonths.map(ym => {
      const [year, month] = ym.split('-');
      const mIdx = parseInt(month, 10) - 1;
      const label = `${monthNames[mIdx] || month} ${year.slice(-2)}`;
      return {
        mes: label,
        ingresos: Math.round(incomeByMonth[ym] || 0),
        egresos: Math.round(expenseByMonth[ym] || 0)
      };
    });
  }, [pagos, egresos]);

  // 2. Data for Donut Chart (Contado vs Crédito)
  const donutData = useMemo(() => {
    const contadoCount = contratos.filter(c => c.forma_compra === 'CONTADO' || c.estado === 'LIQUIDADO').length;
    const creditoCount = contratos.filter(c => c.forma_compra === 'CREDITO' && c.estado !== 'LIQUIDADO').length;
    
    return [
      { name: 'Crédito Directo', value: creditoCount || 116, color: activeColorTheme.accent },
      { name: 'Venta al Contado', value: contadoCount || 10, color: '#64748b' }
    ];
  }, [contratos, activeColorTheme]);

  // 3. Last 6 payments registered
  const ultimosAbonos = useMemo(() => {
    return pagos.slice(0, 6);
  }, [pagos]);

  // Channel badge (minimalist pastel)
  const renderChannelBadge = (metodo: MetodoPago) => {
    switch (metodo) {
      case 'YAPE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <Smartphone className="w-3 h-3" />
            YAPE
          </span>
        );
      case 'BCP':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Building className="w-3 h-3" />
            BCP
          </span>
        );
      case 'INTERBANK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building className="w-3 h-3" />
            INTERBANK
          </span>
        );
      case 'BANBIF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Building className="w-3 h-3" />
            BANBIF
          </span>
        );
      case 'EFECTIVO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Wallet className="w-3 h-3" />
            EFECTIVO
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Dashboard Financiero
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Resumen consolidado de ingresos, egresos y control de cobranzas en vivo
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNuevoClienteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            + Nuevo Cliente
          </button>
          <button
            onClick={() => setIsNuevaVentaModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            + Registrar Venta
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Recaudación Total Ingresos */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Recaudación Total Ingresos
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              S/ {metrics.recaudacionTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-[11px] text-slate-500">
              {pagos.length} pagos registrados
            </p>
          </div>
        </div>

        {/* KPI 2: Cartera por Cobrar */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Cartera por Cobrar
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              S/ {metrics.carteraCobrarActiva.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-[11px] text-slate-500">
              Saldo pendiente de financiamiento
            </p>
          </div>
        </div>

        {/* KPI 3: Lotes Vendidos */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Lotes Vendidos
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {metrics.lotesVendidos}
              </span>
              <span className="text-slate-500 text-xs font-medium">
                / {metrics.totalLotes} lotes
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full rounded-full"
                  style={{ width: `${Math.round((metrics.lotesVendidos / (metrics.totalLotes || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">
                {Math.round((metrics.lotesVendidos / (metrics.totalLotes || 1)) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Balance de Caja */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Balance de Caja
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2.5">
            <span className="text-2xl font-bold text-emerald-700 tracking-tight">
              S/ {metrics.flujoCajaNeto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <p className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Egresos reales: S/ {metrics.totalEgresos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-slate-400 font-mono">({egresos.length} regs)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Ingresos vs Egresos por Mes
              </h3>
              <p className="text-xs text-slate-500">Comparativa mensual de flujo de caja</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                <span className="text-slate-600">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-400"></span>
                <span className="text-slate-600">Egresos</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) => `S/${val >= 1000 ? `${val / 1000}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any) => [`S/ ${Number(value).toLocaleString('es-PE')}`, '']}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill={activeColorTheme.accent} radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
              Modalidad de Venta
            </h3>
            <p className="text-xs text-slate-500 mb-2">Contratos al Contado vs Crédito</p>

            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center pointer-events-none">
                <span className="text-xl font-bold text-slate-800 block">
                  {contratos.length}
                </span>
                <span className="text-[10px] text-slate-400">Total</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            {donutData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feed de Últimos Abonos */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Últimos Abonos Registrados
            </h3>
            <p className="text-xs text-slate-500">Últimas transacciones registradas</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {pagos.length} abonos en total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-medium border-y border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Fecha</th>
                <th className="px-3 py-2.5">Contrato / Titular</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Canal</th>
                <th className="px-3 py-2.5">N° Operación</th>
                <th className="px-3 py-2.5 text-right">Monto</th>
                <th className="px-3 py-2.5 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ultimosAbonos.map((pago) => (
                <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono">
                    {pago.fecha_pago}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold text-slate-900 block">
                      {pago.codigo_contrato || 'CTR-GENERAL'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate block max-w-xs">
                      {pago.propietario || 'Titular'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                      {pago.tipo_pago}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {renderChannelBadge(pago.metodo_pago)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-slate-500">
                    {pago.numero_operacion}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right font-semibold text-slate-900">
                    S/ {Number(pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-center">
                    <button
                      onClick={() => setActiveVoucher(pago)}
                      className="px-2 py-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        pago={activeVoucher}
        onClose={() => setActiveVoucher(null)}
      />
    </div>
  );
};


