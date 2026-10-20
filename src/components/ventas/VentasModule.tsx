import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../services/supabase';
import { Contrato } from '../../types/database';
import { 
  Search, 
  Eye, 
  Building2, 
  ChevronLeft, 
  ChevronRight,
  UserPlus,
  FilePlus,
  RefreshCw,
  AlertCircle,
  Calendar,
  BarChart3,
  TrendingUp,
  Award,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  CheckCircle2,
  Filter
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
  Cell,
  Legend
} from 'recharts';

type ModuleView = 'reporte' | 'explorador';
type VentasTab = 'TODOS' | 'CREDITO' | 'CONTADO' | 'DESISTIDO';

interface MesDef {
  key: string;
  label: string;
  short: string;
  order: number;
}

const MESES_CONFIG: MesDef[] = [
  { key: 'ENERO', label: 'Enero', short: 'Ene', order: 1 },
  { key: 'FEBRERO', label: 'Febrero', short: 'Feb', order: 2 },
  { key: 'MARZO', label: 'Marzo', short: 'Mar', order: 3 },
  { key: 'ABRIL', label: 'Abril', short: 'Abr', order: 4 },
  { key: 'MAYO', label: 'Mayo', short: 'May', order: 5 },
  { key: 'JUNIO', label: 'Junio', short: 'Jun', order: 6 },
  { key: 'JULIO', label: 'Julio', short: 'Jul', order: 7 },
  { key: 'AGOSTO', label: 'Agosto', short: 'Ago', order: 8 },
  { key: 'SEPTIEMBRE', label: 'Septiembre', short: 'Set', order: 9 },
  { key: 'OCTUBRE', label: 'Octubre', short: 'Oct', order: 10 },
  { key: 'NOVIEMBRE', label: 'Noviembre', short: 'Nov', order: 11 },
  { key: 'DICIEMBRE', label: 'Diciembre', short: 'Dic', order: 12 },
];

export const VentasModule: React.FC = () => {
  const { 
    setSelectedContractDetail, 
    setIsNuevoClienteModalOpen,
    setIsNuevaVentaModalOpen,
    setContratos: setGlobalContratos
  } = useData();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Main View Switcher: 'reporte' (Monthly Breakdown & Charts) vs 'explorador' (General Table)
  const [moduleView, setModuleView] = useState<ModuleView>('reporte');

  // Month selector state: 'ALL' or month name (e.g. 'OCTUBRE', 'NOVIEMBRE', etc.)
  const [selectedMes, setSelectedMes] = useState<string>('ALL');

  // Filters for Explorador General view
  const [activeTab, setActiveTab] = useState<VentasTab>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Filters for Reporte Mensual table view
  const [reporteSearch, setReporteSearch] = useState('');
  const [reporteTab, setReporteTab] = useState<VentasTab>('TODOS');
  const [reportePage, setReportePage] = useState(1);

  // Consulta directa a Supabase de la tabla 'contratos'
  const fetchContratos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let { data, error: queryError } = await supabase
        .from('contratos')
        .select(`
          id,
          codigo_contrato,
          asesor,
          mes_contrato,
          forma_compra,
          precio_venta,
          monto_inicial,
          saldo_financiar,
          cantidad_cuotas,
          monto_cuota,
          cuotas_pagadas_base,
          fecha_primer_pago,
          estado,
          cliente_id,
          lote_id,
          clientes!contratos_cliente_id_fkey ( id, dni, nombres_apellidos, telefono, correo, direccion, distrito, provincia, departamento ),
          lotes!contratos_lote_id_fkey ( id, etapa, manzana, numero_lote, area_m2, precio_lista, estado )
        `)
        .order('id', { ascending: true });

      // Desambiguar llaves foráneas si PostgREST devuelve PGRST201
      if (queryError && queryError.code === 'PGRST201') {
        const retry = await supabase
          .from('contratos')
          .select(`
            id,
            codigo_contrato,
            asesor,
            mes_contrato,
            forma_compra,
            precio_venta,
            monto_inicial,
            saldo_financiar,
            cantidad_cuotas,
            monto_cuota,
            cuotas_pagadas_base,
            fecha_primer_pago,
            estado,
            cliente_id,
            lote_id,
            clientes!contratos_cliente_id_fkey ( id, dni, nombres_apellidos, telefono, correo, direccion, distrito, provincia, departamento ),
            lotes!contratos_lote_id_fkey ( id, etapa, manzana, numero_lote, area_m2, precio_lista, estado )
          `)
          .order('id', { ascending: true });
        data = retry.data;
        queryError = retry.error;
      }

      if (queryError) {
        console.error('Error al consultar tabla contratos en Supabase:', queryError);
        setError(queryError.message);
        setContratos([]);
      } else if (data) {
        const normalized: Contrato[] = data.map((row: any) => {
          const clienteObj = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
          const loteObj = Array.isArray(row.lotes) ? row.lotes[0] : row.lotes;

          const clienteNormalized = clienteObj ? {
            id: clienteObj.id || 0,
            dni: clienteObj.dni || '',
            nombres_apellidos: clienteObj.nombres_apellidos || '',
            telefono: clienteObj.telefono || '',
            correo: clienteObj.correo || '',
            direccion: clienteObj.direccion || '',
            distrito: clienteObj.distrito || '',
            provincia: clienteObj.provincia || '',
            departamento: clienteObj.departamento || ''
          } : undefined;

          return {
            id: row.id,
            codigo_contrato: row.codigo_contrato,
            asesor: row.asesor ? String(row.asesor).trim() : 'Sin Asesor',
            mes_contrato: row.mes_contrato ? String(row.mes_contrato).trim().toUpperCase() : '',
            forma_compra: row.forma_compra,
            precio_venta: Number(row.precio_venta || 0),
            monto_inicial: Number(row.monto_inicial || 0),
            saldo_financiar: Number(row.saldo_financiar || 0),
            cantidad_cuotas: Number(row.cantidad_cuotas || 0),
            monto_cuota: Number(row.monto_cuota || 0),
            cuotas_pagadas_base: Number(row.cuotas_pagadas_base || 0),
            fecha_primer_pago: row.fecha_primer_pago || '',
            estado: row.estado,
            cliente_id: row.cliente_id || (clienteObj?.id ?? 0),
            lote_id: row.lote_id || (loteObj?.id ?? 0),
            cliente: clienteNormalized,
            clientes: clienteNormalized,
            lote: loteObj,
            lotes: loteObj
          };
        });

        setContratos(normalized);
        setGlobalContratos(normalized);
      }
    } catch (err: any) {
      console.error('Excepción al conectar con Supabase:', err);
      setError(err?.message || 'Error de conexión con la base de datos de Supabase');
      setContratos([]);
    } finally {
      setLoading(false);
    }
  }, [setGlobalContratos]);

  useEffect(() => {
    fetchContratos();
  }, [fetchContratos]);

  // Normalize month name helper
  const normalizeMonth = (m?: string): string => {
    if (!m) return '';
    return m.trim().toUpperCase();
  };

  // 1. Contratos grouped by month and counts
  const monthStats = useMemo(() => {
    const stats: Record<string, { count: number; totalVenta: number; totalInicial: number; totalSaldo: number }> = {};
    
    MESES_CONFIG.forEach(m => {
      stats[m.key] = { count: 0, totalVenta: 0, totalInicial: 0, totalSaldo: 0 };
    });

    contratos.forEach(c => {
      const mesKey = normalizeMonth(c.mes_contrato);
      if (stats[mesKey]) {
        stats[mesKey].count += 1;
        stats[mesKey].totalVenta += Number(c.precio_venta || 0);
        stats[mesKey].totalInicial += Number(c.monto_inicial || 0);
        stats[mesKey].totalSaldo += Number(c.saldo_financiar || 0);
      }
    });

    return stats;
  }, [contratos]);

  // 2. Bar Chart Data: Monthly Sales Volume and Lot Count
  const monthlyChartData = useMemo(() => {
    return MESES_CONFIG.map(m => {
      const data = monthStats[m.key] || { count: 0, totalVenta: 0, totalInicial: 0, totalSaldo: 0 };
      return {
        mesKey: m.key,
        mes: m.short,
        mesFull: m.label,
        ventasSoles: Math.round(data.totalVenta),
        lotesVendidos: data.count,
        iniciales: Math.round(data.totalInicial),
        isSelected: selectedMes === m.key
      };
    });
  }, [monthStats, selectedMes]);

  // 3. Filtered contracts for the "Reporte Mensual" tab
  const monthScopedContratos = useMemo(() => {
    if (selectedMes === 'ALL') return contratos;
    return contratos.filter(c => normalizeMonth(c.mes_contrato) === selectedMes);
  }, [contratos, selectedMes]);

  // 4. Advisor Ranking in the selected period
  const advisorStats = useMemo(() => {
    const map = new Map<string, { asesor: string; lotes: number; totalVenta: number }>();

    monthScopedContratos.forEach(c => {
      const asesorName = c.asesor || 'Sin Asesor';
      const current = map.get(asesorName) || { asesor: asesorName, lotes: 0, totalVenta: 0 };
      current.lotes += 1;
      current.totalVenta += Number(c.precio_venta || 0);
      map.set(asesorName, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.lotes - a.lotes || b.totalVenta - a.totalVenta)
      .slice(0, 6);
  }, [monthScopedContratos]);

  // 5. Modality distribution (Crédito vs Contado) in selected period
  const modalityDonutData = useMemo(() => {
    const credito = monthScopedContratos.filter(c => c.forma_compra === 'CREDITO' && c.estado !== 'LIQUIDADO').length;
    const contado = monthScopedContratos.filter(c => c.forma_compra === 'CONTADO' || c.estado === 'LIQUIDADO').length;
    const desistido = monthScopedContratos.filter(c => c.estado === 'DESISTIDO').length;

    return [
      { name: 'Crédito Directo', value: credito, color: '#10b981' },
      { name: 'Venta Contado', value: contado, color: '#3b82f6' },
      ...(desistido > 0 ? [{ name: 'Desistidos', value: desistido, color: '#94a3b8' }] : [])
    ];
  }, [monthScopedContratos]);

  // 6. Manzanas distribution in selected period
  const manzanaStats = useMemo(() => {
    const map = new Map<string, number>();
    monthScopedContratos.forEach(c => {
      const loteObj = c.lote || (c as any).lotes;
      if (loteObj?.manzana) {
        const mz = `Mz ${loteObj.manzana.toUpperCase().trim()}`;
        map.set(mz, (map.get(mz) || 0) + 1);
      }
    });

    return Array.from(map.entries())
      .map(([manzana, cantidad]) => ({ manzana, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [monthScopedContratos]);

  // 7. KPIs for the selected period
  const periodKpis = useMemo(() => {
    const totalVendido = monthScopedContratos.reduce((sum, c) => sum + Number(c.precio_venta || 0), 0);
    const totalInicial = monthScopedContratos.reduce((sum, c) => sum + Number(c.monto_inicial || 0), 0);
    const totalSaldo = monthScopedContratos.reduce((sum, c) => sum + Number(c.saldo_financiar || 0), 0);
    const count = monthScopedContratos.length;
    const creditoCount = monthScopedContratos.filter(c => c.forma_compra === 'CREDITO').length;
    const contadoCount = monthScopedContratos.filter(c => c.forma_compra === 'CONTADO').length;
    const topAsesor = advisorStats.length > 0 ? advisorStats[0] : null;

    return {
      totalVendido,
      totalInicial,
      totalSaldo,
      count,
      creditoCount,
      contadoCount,
      topAsesor
    };
  }, [monthScopedContratos, advisorStats]);

  // 8. Filtered table data for the selected month in Reporte view
  const filteredReporteContratos = useMemo(() => {
    return monthScopedContratos.filter(c => {
      if (reporteTab === 'CREDITO') {
        if (c.forma_compra !== 'CREDITO' || c.estado === 'LIQUIDADO' || c.estado === 'DESISTIDO') return false;
      } else if (reporteTab === 'CONTADO') {
        if (c.forma_compra !== 'CONTADO' && c.estado !== 'LIQUIDADO') return false;
      } else if (reporteTab === 'DESISTIDO') {
        if (c.estado !== 'DESISTIDO') return false;
      }

      if (reporteSearch.trim()) {
        const q = reporteSearch.toLowerCase();
        const clientName = (c.cliente?.nombres_apellidos || (c as any).clientes?.nombres_apellidos || '').toLowerCase();
        const clientDni = (c.cliente?.dni || (c as any).clientes?.dni || '').toLowerCase();
        const asesorName = (c.asesor || '').toLowerCase();
        const loteObj = c.lote || (c as any).lotes;
        const loteStr = loteObj ? `${loteObj.manzana}-${loteObj.numero_lote}`.toLowerCase() : '';

        const matchCode = (c.codigo_contrato || '').toLowerCase().includes(q);
        const matchClient = clientName.includes(q);
        const matchDni = clientDni.includes(q);
        const matchAsesor = asesorName.includes(q);
        const matchLote = loteStr.includes(q);

        if (!matchCode && !matchClient && !matchDni && !matchAsesor && !matchLote) return false;
      }

      return true;
    });
  }, [monthScopedContratos, reporteTab, reporteSearch]);

  const reporteTotalPages = Math.ceil(filteredReporteContratos.length / 10) || 1;
  const paginatedReporteContratos = useMemo(() => {
    const start = (reportePage - 1) * 10;
    return filteredReporteContratos.slice(start, start + 10);
  }, [filteredReporteContratos, reportePage]);

  // Explorador General filters
  const tabCounts = useMemo(() => {
    return {
      todos: contratos.length,
      credito: contratos.filter(c => c.forma_compra === 'CREDITO' && c.estado !== 'LIQUIDADO' && c.estado !== 'DESISTIDO').length,
      contado: contratos.filter(c => c.forma_compra === 'CONTADO' || c.estado === 'LIQUIDADO').length,
      desistido: contratos.filter(c => c.estado === 'DESISTIDO').length
    };
  }, [contratos]);

  const filteredContratos = useMemo(() => {
    return contratos.filter((c) => {
      if (activeTab === 'CREDITO') {
        if (c.forma_compra !== 'CREDITO' || c.estado === 'LIQUIDADO' || c.estado === 'DESISTIDO') return false;
      } else if (activeTab === 'CONTADO') {
        if (c.forma_compra !== 'CONTADO' && c.estado !== 'LIQUIDADO') return false;
      } else if (activeTab === 'DESISTIDO') {
        if (c.estado !== 'DESISTIDO') return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const clientName = (c.cliente?.nombres_apellidos || (c as any).clientes?.nombres_apellidos || '').toLowerCase();
        const clientDni = (c.cliente?.dni || (c as any).clientes?.dni || '').toLowerCase();
        const asesorName = (c.asesor || '').toLowerCase();
        const loteObj = c.lote || (c as any).lotes;
        const loteStr = loteObj ? `${loteObj.manzana}-${loteObj.numero_lote}`.toLowerCase() : '';

        const matchCode = (c.codigo_contrato || '').toLowerCase().includes(q);
        const matchClient = clientName.includes(q);
        const matchDni = clientDni.includes(q);
        const matchAsesor = asesorName.includes(q);
        const matchLote = loteStr.includes(q);

        if (!matchCode && !matchClient && !matchDni && !matchAsesor && !matchLote) return false;
      }

      return true;
    });
  }, [contratos, activeTab, searchTerm]);

  const totalPages = Math.ceil(filteredContratos.length / pageSize) || 1;
  const paginatedContratos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContratos.slice(start, start + pageSize);
  }, [filteredContratos, currentPage, pageSize]);

  // Selected month label
  const selectedMonthLabel = useMemo(() => {
    if (selectedMes === 'ALL') return 'Todos los Meses (Consolidado)';
    const found = MESES_CONFIG.find(m => m.key === selectedMes);
    return found ? `${found.label} 2026` : selectedMes;
  }, [selectedMes]);

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestión de Contratos &amp; Ventas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {contratos.length} ventas en base de datos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualización mensualizada, reportes gráficos por asesor y control de expedientes de venta
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchContratos}
            disabled={loading}
            title="Sincronizar directamente con Supabase"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => setIsNuevoClienteModalOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Nuevo Cliente</span>
          </button>

          <button
            onClick={() => setIsNuevaVentaModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>+ Registrar Venta</span>
          </button>
        </div>
      </div>

      {/* Main View Switcher Pills */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModuleView('reporte')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              moduleView === 'reporte'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reporte de Ventas por Mes &amp; Gráficos</span>
          </button>

          <button
            onClick={() => setModuleView('explorador')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              moduleView === 'explorador'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Explorador General de Expedientes ({contratos.length})</span>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-red-800">
                Error al consultar la tabla contratos en Supabase
              </h3>
              <p className="text-xs text-red-600 mt-0.5 font-mono">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchContratos}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 1: REPORTE MENSUAL & GRÁFICOS INTERACTIVOS              */}
      {/* ============================================================== */}
      {moduleView === 'reporte' && (
        <div className="space-y-5">
          {/* Month Selector Carousel / Tabs */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                Seleccionar Mes de Venta (Contratos Registrados)
              </span>
              <span className="text-[11px] text-slate-400">
                Mostrando datos de: <b className="text-slate-700">{selectedMonthLabel}</b>
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
              {/* Button: TODOS */}
              <button
                onClick={() => { setSelectedMes('ALL'); setReportePage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMes === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Todos los Meses</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedMes === 'ALL' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}>
                  {contratos.length}
                </span>
              </button>

              {/* Monthly Pills */}
              {MESES_CONFIG.map(m => {
                const count = monthStats[m.key]?.count || 0;
                const isSelected = selectedMes === m.key;
                const hasVentas = count > 0;

                return (
                  <button
                    key={m.key}
                    onClick={() => { setSelectedMes(m.key); setReportePage(1); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold ring-2 ring-emerald-500/30'
                        : hasVentas
                          ? 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                          : 'bg-slate-50/50 text-slate-400 border border-dashed border-slate-200'
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected 
                        ? 'bg-emerald-700 text-white' 
                        : hasVentas 
                          ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' 
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Summary Cards for Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Volumen de Venta */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Volumen de Venta ({selectedMonthLabel})
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  S/ {periodKpis.totalVendido.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Total pactado en {periodKpis.count} contratos
                </p>
              </div>
            </div>

            {/* KPI 2: Recaudación Iniciales */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Iniciales Recaudadas
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-blue-700 tracking-tight">
                  S/ {periodKpis.totalInicial.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  Flujo de caja inmediato por cuotas iniciales
                </p>
              </div>
            </div>

            {/* KPI 3: Saldo Financiado */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Saldo en Financiamiento
                </span>
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  S/ {periodKpis.totalSaldo.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  {periodKpis.creditoCount} contratos a crédito directo
                </p>
              </div>
            </div>

            {/* KPI 4: Top Asesor del Periodo */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Top Asesor de Cierre
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight block truncate">
                  {periodKpis.topAsesor ? periodKpis.topAsesor.asesor : 'Sin registros'}
                </span>
                <p className="mt-1 text-[11px] text-slate-500">
                  {periodKpis.topAsesor 
                    ? `${periodKpis.topAsesor.lotes} ventas cerradas (S/ ${periodKpis.topAsesor.totalVenta.toLocaleString('es-PE')})`
                    : 'No hay ventas en este periodo'}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row: Monthly Volume & Advisor Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1: Bar Chart of all 12 months */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Evolución de Ventas por Mes (2026)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Monto total facturado (S/) y cantidad de lotes vendidos cada mes. Clic en una barra para filtrar.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                    <span className="text-slate-600">Volumen S/</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                    <span className="text-slate-600">Mes Activo</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={monthlyChartData} 
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        const clicked = data.activePayload[0].payload.mesKey;
                        setSelectedMes(clicked);
                        setReportePage(1);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      tickFormatter={(val) => `S/${(val / 1000).toFixed(0)}k`} 
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => {
                        if (name === 'ventasSoles') return [`S/ ${Number(value).toLocaleString('es-PE')}`, 'Total Vendido'];
                        return [value, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          const p = payload[0].payload;
                          return `${p.mesFull} 2026 (${p.lotesVendidos} lotes vendidos)`;
                        }
                        return label;
                      }}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar 
                      dataKey="ventasSoles" 
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    >
                      {monthlyChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.mesKey === selectedMes ? '#059669' : '#10b981'}
                          opacity={selectedMes === 'ALL' || entry.mesKey === selectedMes ? 1 : 0.45}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Modalidad Donut & Manzanas Ranking */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Modalidad de Venta ({selectedMonthLabel})
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  Distribución entre venta al contado y crédito directo
                </p>

                <div className="h-44 w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modalityDonutData}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {modalityDonutData.map((entry, index) => (
                          <Cell key={`donut-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any, name: any) => [`${val} contratos`, name]}
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-medium block">Total</span>
                    <span className="text-lg font-bold text-slate-800">{monthScopedContratos.length}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 text-xs mt-1">
                  {modalityDonutData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}: <b>{item.value}</b></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manzanas más vendidas */}
              <div className="pt-4 mt-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block mb-2">
                  Manzanas con mayor movimiento:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {manzanaStats.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin lotes en este periodo</span>
                  ) : (
                    manzanaStats.map((mz, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {mz.manzana}: <b>{mz.cantidad} lotes</b>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ranking de Asesores Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Ranking de Asesores de Ventas ({selectedMonthLabel})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rendimiento y cantidad de contratos formalizados por asesor
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {advisorStats.map((adv, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      idx === 0 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : idx === 1 
                          ? 'bg-slate-200 text-slate-700' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-800 block truncate">
                        {adv.asesor}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Volumen: S/ {adv.totalVenta.toLocaleString('es-PE')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {adv.lotes} lotes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table of Contracts for the Selected Month */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Table Header Controls */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Expedientes y Contratos de {selectedMonthLabel}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  {filteredReporteContratos.length} contratos
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Status tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
                  <button
                    onClick={() => { setReporteTab('TODOS'); setReportePage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      reporteTab === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => { setReporteTab('CREDITO'); setReportePage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      reporteTab === 'CREDITO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    A Crédito
                  </button>
                  <button
                    onClick={() => { setReporteTab('CONTADO'); setReportePage(1); }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      reporteTab === 'CONTADO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Al Contado
                  </button>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={reporteSearch}
                    onChange={(e) => {
                      setReporteSearch(e.target.value);
                      setReportePage(1);
                    }}
                    placeholder="Buscar contrato, titular, DNI..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Código Contrato</th>
                    <th className="px-4 py-3">Titular / DNI</th>
                    <th className="px-4 py-3">Lote Adquirido</th>
                    <th className="px-4 py-3">Asesor</th>
                    <th className="px-4 py-3">Modalidad</th>
                    <th className="px-4 py-3 text-right">Precio Venta</th>
                    <th className="px-4 py-3 text-right">Inicial</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-500">Cargando contratos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReporteContratos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No hay contratos para el filtro seleccionado
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Selecciona otro mes o modifica los términos de búsqueda
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedReporteContratos.map((ctr) => {
                      const isContado = ctr.forma_compra === 'CONTADO' || ctr.estado === 'LIQUIDADO';
                      const isDesistido = ctr.estado === 'DESISTIDO';
                      const clienteObj = ctr.cliente || (ctr as any).clientes;
                      const loteObj = ctr.lote || (ctr as any).lotes;

                      return (
                        <tr key={ctr.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 font-mono text-xs block">
                              {ctr.codigo_contrato}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {ctr.mes_contrato || 'Sin periodo'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800 text-xs block truncate max-w-[180px]">
                              {clienteObj?.nombres_apellidos || 'Sin titular'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {clienteObj?.dni ? `DNI ${clienteObj.dni}` : 'Sin DNI'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>
                                {loteObj 
                                  ? `Etapa ${loteObj.etapa ?? 1} • Mz ${loteObj.manzana || '-'} • Lt ${loteObj.numero_lote || '-'}`
                                  : 'Lote no asignado'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Área: {loteObj?.area_m2 ? `${loteObj.area_m2} m²` : 'N/D'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="text-xs text-slate-700 font-medium block truncate max-w-[130px]">
                              {ctr.asesor || 'Sin Asesor'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {isContado ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Al Contado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Crédito
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap font-semibold text-slate-900">
                            S/ {Number(ctr.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap text-emerald-700 font-medium">
                            S/ {Number(ctr.monto_inicial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-800">
                            {isContado ? (
                              <span className="text-slate-400">S/ 0.00</span>
                            ) : (
                              `S/ ${Number(ctr.saldo_financiar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isContado ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Liquidado
                              </span>
                            ) : isDesistido ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Desistido
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Activo
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedContractDetail(ctr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver Ficha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                <span>Página <b>{reportePage}</b> de <b>{reporteTotalPages}</b></span>
                <span className="mx-2">•</span>
                <span>Total <b>{filteredReporteContratos.length}</b> contratos en {selectedMonthLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReportePage(prev => Math.max(1, prev - 1))}
                  disabled={reportePage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setReportePage(prev => Math.min(reporteTotalPages, prev + 1))}
                  disabled={reportePage >= reporteTotalPages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VISTA 2: EXPLORADOR GENERAL DE EXPEDIENTES                    */}
      {/* ============================================================== */}
      {moduleView === 'explorador' && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            {/* Tabs Row */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
              <button
                onClick={() => { setActiveTab('TODOS'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'TODOS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] text-slate-400 font-mono">({tabCounts.todos})</span>
              </button>

              <button
                onClick={() => { setActiveTab('CREDITO'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'CREDITO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>A Crédito</span>
                <span className="text-[10px] text-slate-400 font-mono">({tabCounts.credito})</span>
              </button>

              <button
                onClick={() => { setActiveTab('CONTADO'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'CONTADO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Al Contado</span>
                <span className="text-[10px] text-slate-400 font-mono">({tabCounts.contado})</span>
              </button>

              <button
                onClick={() => { setActiveTab('DESISTIDO'); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'DESISTIDO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Desistidos</span>
                <span className="text-[10px] text-slate-400 font-mono">({tabCounts.desistido})</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por contrato, titular o DNI..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Contracts Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Código Contrato</th>
                    <th className="px-4 py-3">Titular / DNI</th>
                    <th className="px-4 py-3">Lote Adquirido</th>
                    <th className="px-4 py-3">Modalidad</th>
                    <th className="px-4 py-3 text-right">Precio Venta</th>
                    <th className="px-4 py-3 text-right">Saldo Deudor</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium text-slate-500">
                            Cargando registros reales desde Supabase...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredContratos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-slate-600">
                          No se encontraron contratos registrados
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {searchTerm ? 'Intenta modificar el término de búsqueda o pestaña seleccionada' : 'La tabla contratos no contiene expedientes'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedContratos.map((ctr) => {
                      const isContado = ctr.forma_compra === 'CONTADO' || ctr.estado === 'LIQUIDADO';
                      const isDesistido = ctr.estado === 'DESISTIDO';
                      const clienteObj = ctr.cliente || (ctr as any).clientes;
                      const loteObj = ctr.lote || (ctr as any).lotes;

                      return (
                        <tr key={ctr.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900 font-mono text-xs block">
                              {ctr.codigo_contrato}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {ctr.mes_contrato || 'Sin periodo'} • Asesor: {ctr.asesor || 'Sin asesor'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800 text-xs block truncate max-w-xs">
                              {clienteObj?.nombres_apellidos || 'Sin titular registrado'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {clienteObj?.dni ? `DNI ${clienteObj.dni}` : 'Sin DNI'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>
                                {loteObj 
                                  ? `Etapa ${loteObj.etapa ?? 1} • Mz ${loteObj.manzana || '-'} • Lt ${loteObj.numero_lote || '-'}`
                                  : 'Lote no asignado'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Área: {loteObj?.area_m2 ? `${loteObj.area_m2} m²` : 'N/D'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {isContado ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Al Contado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Crédito
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900">
                            S/ {Number(ctr.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {isContado ? (
                              <div>
                                <span className="font-medium text-emerald-700 text-xs block">
                                  S/ 0.00
                                </span>
                                <span className="text-[10px] text-slate-400">0 cuotas pend.</span>
                              </div>
                            ) : (
                              <div>
                                <span className={`font-semibold text-xs block ${isDesistido ? 'text-slate-400' : 'text-slate-900'}`}>
                                  S/ {Number(ctr.saldo_financiar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-slate-400">Cuota: S/ {Number(ctr.monto_cuota).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {isContado ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                Liquidado
                              </span>
                            ) : isDesistido ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                Desistido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Activo
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedContractDetail(ctr)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver Ficha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                <span>Página <b>{currentPage}</b> de <b>{totalPages}</b></span>
                <span className="mx-2">•</span>
                <span>Total <b>{filteredContratos.length}</b> expedientes</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
