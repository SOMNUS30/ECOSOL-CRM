import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TipoEgreso } from '../../types/database';
import { toast } from 'sonner';
import { 
  Wallet, 
  Plus, 
  Receipt, 
  PieChart, 
  TrendingDown, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Info,
  Search,
  Filter,
  ChevronDown
} from 'lucide-react';

// Format 'YYYY-MM' as 'Mes Año' (e.g. '2026-10' -> 'Octubre 2026')
const formatMonthLabel = (yearMonth: string) => {
  if (!yearMonth || yearMonth === 'ALL') return 'Todos los Meses';
  try {
    const parts = yearMonth.split('-');
    if (parts.length >= 2) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthName = monthNames[monthNum - 1] || parts[1];
      return `${monthName} ${year}`;
    }
    return yearMonth;
  } catch {
    return yearMonth;
  }
};

// Highlight matching search query inside description text
const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const q = query.trim();
  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return text;
  const before = text.substring(0, index);
  const match = text.substring(index, index + q.length);
  const after = text.substring(index + q.length);
  return (
    <>
      {before}
      <mark className="bg-amber-100 text-amber-900 rounded px-0.5 font-medium">{match}</mark>
      {after}
    </>
  );
};

interface CategoryOption {
  id: string;
  label: string;
  hint: string;
}

const CATEGORIAS_FIJAS: CategoryOption[] = [
  {
    id: 'INFRAESTRUCTURA Y SERVICIO',
    label: 'INFRAESTRUCTURA Y SERVICIO',
    hint: 'Alquiler, Luz, Internet, Emapica/Agua, Gas'
  },
  {
    id: 'SUELDOS',
    label: 'SUELDOS',
    hint: 'Planilla, Pagos administrativos, Personal fijo'
  },
  {
    id: 'OBLIGACIONES Y FINANZAS',
    label: 'OBLIGACIONES Y FINANZAS',
    hint: 'Impuestos, Cuotas bancarias fijas'
  },
  {
    id: 'OTRA CATEGORÍA FIJA',
    label: 'OTRA CATEGORÍA FIJA',
    hint: 'Permitir escribir una nueva categoría fija'
  }
];

const CATEGORIAS_VARIABLES: CategoryOption[] = [
  {
    id: 'PUBLICIDAD Y MARKETING',
    label: 'PUBLICIDAD Y MARKETING',
    hint: 'Meta Ads, Volantes, Diseños, Activaciones'
  },
  {
    id: 'COMISIONES DE VENTAS',
    label: 'COMISIONES DE VENTAS',
    hint: 'Pagos por cierre de lotes a asesores'
  },
  {
    id: 'TRANSPORTE Y MOVILIDAD',
    label: 'TRANSPORTE Y MOVILIDAD',
    hint: 'Combustible, Pasajes, Traslados de clientes a campo'
  },
  {
    id: 'MANTENIMIENTO Y OBRAS',
    label: 'MANTENIMIENTO Y OBRAS',
    hint: 'Trabajos en proyecto, Limpieza de lotes, Topografía'
  },
  {
    id: 'REFRIGERIOS Y EVENTOS',
    label: 'REFRIGERIOS Y EVENTOS',
    hint: 'Alimentación de personal en campo, Open House'
  },
  {
    id: 'GASTOS ADMINISTRATIVOS MENORES',
    label: 'GASTOS ADMINISTRATIVOS MENORES',
    hint: 'Útiles de oficina, Trámites notariales'
  },
  {
    id: 'OTRA CATEGORÍA VARIABLE',
    label: 'OTRA CATEGORÍA VARIABLE',
    hint: 'Permitir escribir una nueva categoría variable'
  }
];

export const CajaChicaModule: React.FC = () => {
  const { egresos, loadingEgresos, egresosError, refreshEgresos, registrarEgreso } = useData();

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [searchDescription, setSearchDescription] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');

  // Add Egreso Modal Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [fecha, setFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tipo, setTipo] = useState<TipoEgreso>('VARIABLE');
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_VARIABLES[0].id);
  const [customCategoria, setCustomCategoria] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [monto, setMonto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cascading categories list based on current tipo
  const activeCategories = useMemo(() => {
    return tipo === 'FIJO' ? CATEGORIAS_FIJAS : CATEGORIAS_VARIABLES;
  }, [tipo]);

  // Selected category definition to show hint
  const currentCategoryDef = useMemo(() => {
    return activeCategories.find(c => c.id === categoria);
  }, [activeCategories, categoria]);

  const isOtherCategory = categoria === 'OTRA CATEGORÍA FIJA' || categoria === 'OTRA CATEGORÍA VARIABLE';

  // Handler for switching tipo: automatically resets category to first item in new list
  const handleTipoChange = (newTipo: TipoEgreso) => {
    setTipo(newTipo);
    const newCategoryList = newTipo === 'FIJO' ? CATEGORIAS_FIJAS : CATEGORIAS_VARIABLES;
    setCategoria(newCategoryList[0].id);
    setCustomCategoria('');
    setErrorMsg(null);
  };

  const handleOpenModal = () => {
    setFecha(new Date().toISOString().split('T')[0]);
    setTipo('VARIABLE');
    setCategoria(CATEGORIAS_VARIABLES[0].id);
    setCustomCategoria('');
    setDescripcion('');
    setMonto('');
    setErrorMsg(null);
    setShowAddModal(true);
  };

  // Distinct months present in egresos sorted descending (newest first)
  const availableMonths = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    egresos.forEach((e) => {
      if (e.fecha) {
        const ym = e.fecha.slice(0, 7);
        if (ym.length === 7) {
          const current = map.get(ym) || { count: 0, total: 0 };
          current.count += 1;
          current.total += Number(e.monto || 0);
          map.set(ym, current);
        }
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, data]) => ({
        value: ym,
        label: formatMonthLabel(ym),
        count: data.count,
        total: data.total
      }));
  }, [egresos]);

  // Egresos scoped to the selected month (or all if 'ALL')
  const monthScopedEgresos = useMemo(() => {
    if (selectedMonth === 'ALL') return egresos;
    return egresos.filter(e => (e.fecha || '').slice(0, 7) === selectedMonth);
  }, [egresos, selectedMonth]);

  // Financial summary calculated strictly from month-scoped real Supabase records
  const summary = useMemo(() => {
    const list = monthScopedEgresos;
    const total = list.reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const fijos = list.filter(e => e.tipo === 'FIJO').reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const variables = list.filter(e => e.tipo === 'VARIABLE').reduce((sum, e) => sum + Number(e.monto || 0), 0);

    // Group by category
    const categoryMap = new Map<string, number>();
    list.forEach((e) => {
      const cat = (e.categoria || 'OTROS').toUpperCase().trim();
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(e.monto || 0));
    });

    const categoriesBreakdown = Array.from(categoryMap.entries()).map(([cat, amount]) => ({
      categoria: cat,
      monto: amount,
      porcentaje: total > 0 ? Math.round((amount / total) * 100) : 0
    })).sort((a, b) => b.monto - a.monto);

    return { total, fijos, variables, categoriesBreakdown, count: list.length };
  }, [monthScopedEgresos]);

  // Extract unique categories present in the real records for filter dropdown
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    egresos.forEach(e => {
      if (e.categoria) set.add(e.categoria.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [egresos]);

  // Filtered egresos applying Month, Description Search, Category, and Tipo
  const filteredEgresos = useMemo(() => {
    return egresos.filter((e) => {
      // 1. Month filter
      if (selectedMonth !== 'ALL') {
        const ym = (e.fecha || '').slice(0, 7);
        if (ym !== selectedMonth) return false;
      }

      // 2. Description search
      if (searchDescription.trim()) {
        const query = searchDescription.toLowerCase().trim();
        const desc = (e.descripcion || '').toLowerCase();
        if (!desc.includes(query)) return false;
      }

      // 3. Category filter
      if (selectedCategoria !== 'ALL' && (e.categoria || '').toUpperCase().trim() !== selectedCategoria) {
        return false;
      }

      // 4. Tipo filter
      if (selectedTipo !== 'ALL' && e.tipo !== selectedTipo) {
        return false;
      }

      return true;
    });
  }, [egresos, selectedMonth, searchDescription, selectedCategoria, selectedTipo]);

  // Total visible filtered amount
  const filteredTotal = useMemo(() => {
    return filteredEgresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);
  }, [filteredEgresos]);

  const hasActiveFilters = selectedMonth !== 'ALL' || searchDescription.trim() !== '' || selectedCategoria !== 'ALL' || selectedTipo !== 'ALL';

  const handleClearFilters = () => {
    setSelectedMonth('ALL');
    setSearchDescription('');
    setSelectedCategoria('ALL');
    setSelectedTipo('ALL');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorMsg('Por favor ingrese un monto válido mayor a S/ 0.');
      return;
    }

    if (!descripcion.trim()) {
      setErrorMsg('La descripción o concepto del gasto es obligatoria.');
      return;
    }

    const finalCategoria = isOtherCategory 
      ? customCategoria.trim().toUpperCase() 
      : categoria;

    if (isOtherCategory && !customCategoria.trim()) {
      setErrorMsg('Por favor escriba el nombre de la nueva categoría.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registrarEgreso({
        fecha,
        tipo,
        categoria: finalCategoria,
        descripcion: descripcion.trim(),
        monto: Number(parsedMonto.toFixed(2))
      });

      if (res.success) {
        toast.success('Egreso registrado en Supabase', {
          description: `S/ ${parsedMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })} registrado en ${finalCategoria}.`,
          duration: 4000
        });
        setShowAddModal(false);
        setDescripcion('');
        setMonto('');
        setCustomCategoria('');
      } else {
        const errDescription = res.error || 'No se pudo guardar el gasto en Supabase.';
        setErrorMsg(errDescription);
        toast.error('Error al registrar en Supabase', {
          description: errDescription,
          duration: 6000
        });
      }
    } catch (err: any) {
      const msg = err?.message || 'Error inesperado al conectar con Supabase.';
      setErrorMsg(msg);
      toast.error('Error', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Caja Chica &amp; Egresos
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Supabase table: <code className="font-mono">egresos</code>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión en tiempo real de gastos operativos, costos fijos y salidas de caja
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => refreshEgresos()}
            disabled={loadingEgresos}
            title="Recargar egresos desde Supabase"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingEgresos ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* New Egreso button */}
          <button
            onClick={handleOpenModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Egreso</span>
          </button>
        </div>
      </div>

      {/* Supabase Error Alert Banner */}
      {egresosError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-800 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Error al consultar la tabla 'egresos' en Supabase</p>
              <p className="text-[11px] text-rose-700 mt-0.5 font-mono">{egresosError}</p>
            </div>
          </div>
          <button
            onClick={() => refreshEgresos()}
            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 font-medium rounded-md border border-rose-200 text-xs shrink-0 cursor-pointer transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Egresos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {selectedMonth !== 'ALL' ? `Total Egresos (${formatMonthLabel(selectedMonth)})` : 'Total Egresos Reales'}
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {loadingEgresos ? (
              <div className="h-7 w-28 bg-slate-100 animate-pulse rounded my-1" />
            ) : (
              <span className="text-xl font-bold text-slate-900">
                S/ {summary.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {loadingEgresos 
                ? 'Cargando registros...' 
                : selectedMonth !== 'ALL'
                  ? `${summary.count} movimientos en ${formatMonthLabel(selectedMonth)}`
                  : `${egresos.length} movimientos históricos en Supabase`}
            </p>
          </div>
        </div>

        {/* Egresos Fijos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {selectedMonth !== 'ALL' ? `Costos Fijos (${formatMonthLabel(selectedMonth)})` : 'Costos Fijos (Planilla / Local)'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              Fijo
            </span>
          </div>
          <div className="mt-2">
            {loadingEgresos ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-1" />
            ) : (
              <span className="text-xl font-bold text-slate-900">
                S/ {summary.fijos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.total > 0 ? Math.round((summary.fijos / summary.total) * 100) : 0}% del período
            </p>
          </div>
        </div>

        {/* Egresos Variables */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {selectedMonth !== 'ALL' ? `Gastos Variables (${formatMonthLabel(selectedMonth)})` : 'Gastos Variables (Marketing / Operaciones)'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Variable
            </span>
          </div>
          <div className="mt-2">
            {loadingEgresos ? (
              <div className="h-7 w-24 bg-slate-100 animate-pulse rounded my-1" />
            ) : (
              <span className="text-xl font-bold text-slate-900">
                S/ {summary.variables.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {summary.total > 0 ? Math.round((summary.variables / summary.total) * 100) : 0}% del período
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Buscador de Descripción */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchDescription}
              onChange={(e) => setSearchDescription(e.target.value)}
              placeholder="Buscar por descripción o concepto (ej: luz, planilla, combustible, publicidad...)"
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
            />
            {searchDescription && (
              <button
                type="button"
                onClick={() => setSearchDescription('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Mes */}
          <div className="relative min-w-[210px]">
            <div className="absolute left-3 top-2.5 pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none font-medium"
            >
              <option value="ALL">Todos los Meses ({availableMonths.length} períodos)</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Filtro por Tipo */}
          <div className="min-w-[130px]">
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="FIJO">Fijos</option>
              <option value="VARIABLE">Variables</option>
            </select>
          </div>

          {/* Filtro por Categoría */}
          <div className="min-w-[170px]">
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium truncate"
            >
              <option value="ALL">Todas las Categorías</option>
              {existingCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Botón Limpiar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 font-medium"
              title="Restablecer todos los filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Active Filters Summary Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-600" /> Filtros activos:
            </span>

            {selectedMonth !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                Mes: {formatMonthLabel(selectedMonth)}
                <button onClick={() => setSelectedMonth('ALL')} className="hover:text-emerald-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchDescription.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                Descripción: "{searchDescription.trim()}"
                <button onClick={() => setSearchDescription('')} className="hover:text-amber-950 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedTipo !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Tipo: {selectedTipo}
                <button onClick={() => setSelectedTipo('ALL')} className="hover:text-slate-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategoria !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                Categoría: {selectedCategoria}
                <button onClick={() => setSelectedCategoria('ALL')} className="hover:text-slate-900 cursor-pointer ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <span className="text-slate-400 ml-auto font-mono text-[10px]">
              {filteredEgresos.length} {filteredEgresos.length === 1 ? 'movimiento' : 'movimientos'} (Total visible: S/ {filteredTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
        )}
      </div>

      {/* Category Breakdown & Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown List */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-xs">Distribución por Categoría</h3>
            </div>
            {selectedMonth !== 'ALL' && (
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                {formatMonthLabel(selectedMonth)}
              </span>
            )}
          </div>

          {loadingEgresos ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-1.5 animate-pulse">
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-1.5 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : summary.categoriesBreakdown.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <PieChart className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs font-medium text-slate-600">Sin datos de categorías</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {selectedMonth !== 'ALL' 
                  ? `No hay egresos registrados en ${formatMonthLabel(selectedMonth)}.` 
                  : 'No hay egresos registrados para calcular porcentajes.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.categoriesBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 truncate max-w-[170px]" title={cat.categoria}>
                      {cat.categoria}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-medium text-slate-900">
                        S/ {cat.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-slate-400 text-[10px]">({cat.porcentaje}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${cat.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expenses Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-xs">Registros de la Tabla 'egresos'</h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-medium font-mono">
                {filteredEgresos.length} de {egresos.length}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">Suma visible:</span>
              <span className="font-bold text-slate-900 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                S/ {filteredTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">ID</th>
                  <th className="px-3.5 py-2.5">Fecha</th>
                  <th className="px-3.5 py-2.5">Tipo</th>
                  <th className="px-3.5 py-2.5">Categoría</th>
                  <th className="px-3.5 py-2.5">Descripción</th>
                  <th className="px-3.5 py-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loadingEgresos ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-8" /></td>
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-20" /></td>
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-16" /></td>
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-28" /></td>
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-48" /></td>
                      <td className="px-3.5 py-3"><div className="h-3.5 bg-slate-100 rounded w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredEgresos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-2 text-slate-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        {egresos.length === 0 
                          ? 'No hay egresos registrados en Supabase' 
                          : searchDescription.trim() 
                            ? `No se encontraron egresos con la descripción "${searchDescription.trim()}"`
                            : selectedMonth !== 'ALL'
                              ? `No hay egresos registrados en ${formatMonthLabel(selectedMonth)}`
                              : 'No se encontraron egresos con los filtros seleccionados'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {egresos.length === 0
                          ? 'La tabla "egresos" se encuentra vacía. Puede añadir un nuevo movimiento usando el botón superior.'
                          : 'Pruebe restableciendo la búsqueda de descripción o los filtros aplicados.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Restablecer filtros</span>
                        </button>
                      )}
                      {egresos.length === 0 && (
                        <button
                          onClick={handleOpenModal}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar primer egreso</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredEgresos.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        #{String(e.id).slice(-4)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {e.fecha}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          e.tipo === 'FIJO' 
                            ? 'bg-slate-100 text-slate-700 border border-slate-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {e.tipo}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {e.categoria}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">
                        {highlightMatch(e.descripcion || '', searchDescription)}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-semibold text-slate-900 whitespace-nowrap">
                        S/ {Number(e.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Registrar Egreso (Selector en Cascada Tipo -> Categoría) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Registrar Egreso Operativo
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Inserta directamente en la tabla <code className="font-mono text-slate-700">egresos</code> de Supabase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message Alert Banner */}
            {errorMsg && (
              <div className="mb-3.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block">Error de Supabase:</span>
                  <span className="text-[11px] font-mono break-words">{errorMsg}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 1. Selector Tipo de Egreso (Radio Segmented Toggle) */}
              <div>
                <label className="block text-slate-700 mb-1.5 font-medium text-[11px]">
                  Tipo de Egreso <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('FIJO')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tipo === 'FIJO'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${tipo === 'FIJO' ? 'bg-slate-800' : 'bg-slate-300'}`} />
                    <span>FIJO (Costos Fijos)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTipoChange('VARIABLE')}
                    className={`py-2 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tipo === 'VARIABLE'
                        ? 'bg-white text-amber-800 shadow-xs border border-amber-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${tipo === 'VARIABLE' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                    <span>VARIABLE (Operativo)</span>
                  </button>
                </div>
              </div>

              {/* 2. Categoría Dependiente (Cascading Select) */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Categoría ({tipo === 'FIJO' ? 'Fija' : 'Variable'}) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoria}
                  onChange={(e) => {
                    setCategoria(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
                >
                  {activeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                {/* Category Hint / Subtitle */}
                {currentCategoryDef && !isOtherCategory && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                    <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span><b>Incluye:</b> {currentCategoryDef.hint}</span>
                  </p>
                )}

                {/* Custom Category Input if "OTRA CATEGORÍA..." is selected */}
                {isOtherCategory && (
                  <div className="mt-2 animate-fadeIn">
                    <label className="block text-slate-600 text-[10px] uppercase font-semibold mb-1">
                      Especifique el nombre de la nueva categoría {tipo.toLowerCase()} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customCategoria}
                      onChange={(e) => setCustomCategoria(e.target.value)}
                      placeholder="Ej. HONORARIOS NOTARIALES, COMBUSTIBLE CAMIONETA..."
                      className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-slate-800 uppercase text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      required
                    />
                  </div>
                )}
              </div>

              {/* 3. Fecha del Gasto */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Fecha del Gasto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* 4. Descripción o Concepto */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Descripción o Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Pago de luz oficina central, Campaña Meta Ads Lotes Etapa 2..."
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  required
                />
              </div>

              {/* 5. Monto en Soles (S/.) */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Monto en Soles (S/.) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">S/</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Guardando...' : 'Guardar Egreso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
