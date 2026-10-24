import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { TipoEgreso, MetodoPago, Pago } from '../../types/database';
import { VoucherModal } from '../common/VoucherModal';
import { toast } from 'sonner';
import { 
  Wallet, 
  Plus, 
  Receipt, 
  PieChart as PieIcon, 
  TrendingDown, 
  TrendingUp,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  Building,
  Smartphone,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Calculator,
  Sparkles,
  History
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type CajaSubTab = 'flujo' | 'ingresos' | 'egresos';

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
    hint: 'Alquiler, Luz, Internet, Emapica/Agua, Telefonía, Gas, Sunat'
  },
  {
    id: 'SUELDOS',
    label: 'SUELDOS',
    hint: 'Planilla, Pagos a colaboradores, Sueldos del personal fijo'
  },
  {
    id: 'OTRA CATEGORÍA FIJA',
    label: 'OTRA CATEGORÍA FIJA (Personalizada)',
    hint: 'Permite registrar una categoría fija personalizada'
  }
];

const CATEGORIAS_VARIABLES: CategoryOption[] = [
  {
    id: 'RECREATIVO',
    label: 'RECREATIVO',
    hint: 'Refrigerios, Almuerzos de campo, Eventos, Celebraciones'
  },
  {
    id: 'MOVILIDAD',
    label: 'MOVILIDAD',
    hint: 'Combustible, Pasajes, Traslados y Viáticos'
  },
  {
    id: 'CAMPAÑA',
    label: 'CAMPAÑA',
    hint: 'Publicidad, Marketing digital, Meta Ads, Volanteo, Diseños'
  },
  {
    id: 'COMISIONES',
    label: 'COMISIONES',
    hint: 'Comisiones de ventas a asesores y líderes de equipo'
  },
  {
    id: 'MANTENIMIENTO Y SUMINISTRO',
    label: 'MANTENIMIENTO Y SUMINISTRO',
    hint: 'Obras en proyecto, Limpieza de lotes, Topografía, Materiales y Útiles'
  },
  {
    id: 'OTROS',
    label: 'OTROS',
    hint: 'Gastos diversos, Imprevistos, Trámites menores'
  },
  {
    id: 'OTRA CATEGORÍA VARIABLE',
    label: 'OTRA CATEGORÍA VARIABLE (Personalizada)',
    hint: 'Permite registrar una categoría variable personalizada'
  }
];

export const CajaChicaModule: React.FC = () => {
  const { 
    egresos, 
    loadingEgresos, 
    egresosError, 
    refreshEgresos, 
    registrarEgreso,
    pagos,
    loadingPagos,
    refreshPagos,
    eliminarPago
  } = useData();

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<CajaSubTab>('ingresos');

  // Active voucher modal
  const [selectedVoucher, setSelectedVoucher] = useState<Pago | null>(null);

  // Deletion modal state for Pagos (Ingresos)
  const [pagoToDelete, setPagoToDelete] = useState<Pago | null>(null);
  const [isDeletingPago, setIsDeletingPago] = useState<boolean>(false);

  // Month selector for Flujo & Ingresos & Egresos
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // Ingresos Filters
  const [ingresosSearch, setIngresosSearch] = useState<string>('');
  const [ingresosMethod, setIngresosMethod] = useState<string>('ALL');
  const [ingresosPage, setIngresosPage] = useState<number>(1);
  const ingresosPageSize = 15;

  // Egresos Filters
  const [searchDescription, setSearchDescription] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('ALL');
  const [selectedTipo, setSelectedTipo] = useState<string>('ALL');
  const [egresosPage, setEgresosPage] = useState<number>(1);
  const egresosPageSize = 15;

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

  // Description Autocomplete / Memory State
  const [showDescSuggestions, setShowDescSuggestions] = useState<boolean>(false);
  const [descActiveIndex, setDescActiveIndex] = useState<number>(-1);
  const descContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (descContainerRef.current && !descContainerRef.current.contains(event.target as Node)) {
        setShowDescSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // 1. Available Months combined from both Pagos and Egresos
  const availableMonths = useMemo(() => {
    const map = new Map<string, { pagosCount: number; pagosTotal: number; egresosCount: number; egresosTotal: number }>();

    pagos.forEach(p => {
      if (p.fecha_pago) {
        const ym = p.fecha_pago.slice(0, 7);
        if (ym.length === 7) {
          const cur = map.get(ym) || { pagosCount: 0, pagosTotal: 0, egresosCount: 0, egresosTotal: 0 };
          cur.pagosCount += 1;
          cur.pagosTotal += Number(p.monto || 0);
          map.set(ym, cur);
        }
      }
    });

    egresos.forEach(e => {
      if (e.fecha) {
        const ym = e.fecha.slice(0, 7);
        if (ym.length === 7) {
          const cur = map.get(ym) || { pagosCount: 0, pagosTotal: 0, egresosCount: 0, egresosTotal: 0 };
          cur.egresosCount += 1;
          cur.egresosTotal += Number(e.monto || 0);
          map.set(ym, cur);
        }
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([ym, data]) => ({
        value: ym,
        label: formatMonthLabel(ym),
        pagosCount: data.pagosCount,
        pagosTotal: data.pagosTotal,
        egresosCount: data.egresosCount,
        egresosTotal: data.egresosTotal
      }));
  }, [pagos, egresos]);

  // 2. Monthly Comparative Cashflow Chart Data
  const comparativeChartData = useMemo(() => {
    // Return all months in chronological ascending order
    return [...availableMonths].reverse().map(m => {
      const [year, month] = m.value.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
      const mIdx = parseInt(month, 10) - 1;
      const shortLabel = `${monthNames[mIdx] || month} ${year.slice(-2)}`;

      return {
        ym: m.value,
        mes: shortLabel,
        mesFull: m.label,
        ingresos: Math.round(m.pagosTotal),
        egresos: Math.round(m.egresosTotal),
        balance: Math.round(m.pagosTotal - m.egresosTotal)
      };
    });
  }, [availableMonths]);

  // 3. Filtered Pagos (Ingresos)
  const filteredPagos = useMemo(() => {
    return pagos.filter(p => {
      // Month
      if (selectedMonth !== 'ALL') {
        const ym = (p.fecha_pago || '').slice(0, 7);
        if (ym !== selectedMonth) return false;
      }

      // Method
      if (ingresosMethod !== 'ALL' && p.metodo_pago !== ingresosMethod) {
        return false;
      }

      // Search
      if (ingresosSearch.trim()) {
        const q = ingresosSearch.toLowerCase().trim();
        const op = (p.numero_operacion || '').toLowerCase();
        const prop = (p.propietario || '').toLowerCase();
        const ctr = (p.codigo_contrato || '').toLowerCase();
        const tipoP = (p.tipo_pago || '').toLowerCase();

        if (!op.includes(q) && !prop.includes(q) && !ctr.includes(q) && !tipoP.includes(q)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const cmp = (b.fecha_pago || '').localeCompare(a.fecha_pago || '');
      if (cmp !== 0) return cmp;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [pagos, selectedMonth, ingresosMethod, ingresosSearch]);

  const ingresosTotalPages = Math.ceil(filteredPagos.length / ingresosPageSize) || 1;
  const paginatedPagos = useMemo(() => {
    const start = (ingresosPage - 1) * ingresosPageSize;
    return filteredPagos.slice(start, start + ingresosPageSize);
  }, [filteredPagos, ingresosPage]);

  // Total sum of filtered pagos
  const filteredPagosTotal = useMemo(() => {
    return filteredPagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);
  }, [filteredPagos]);

  // Ingresos Summary for active month/filter
  const ingresosSummary = useMemo(() => {
    const list = selectedMonth === 'ALL' ? pagos : pagos.filter(p => (p.fecha_pago || '').slice(0, 7) === selectedMonth);
    const total = list.reduce((sum, p) => sum + Number(p.monto || 0), 0);
    const count = list.length;

    // Methods
    const byMethod: Record<string, number> = {};
    list.forEach(p => {
      const m = p.metodo_pago || 'OTROS';
      byMethod[m] = (byMethod[m] || 0) + Number(p.monto || 0);
    });

    return { total, count, byMethod };
  }, [pagos, selectedMonth]);

  // 4. Egresos logic
  const activeCategories = useMemo(() => {
    return tipo === 'FIJO' ? CATEGORIAS_FIJAS : CATEGORIAS_VARIABLES;
  }, [tipo]);

  const currentCategoryDef = useMemo(() => {
    return activeCategories.find(c => c.id === categoria);
  }, [activeCategories, categoria]);

  const isOtherCategory = categoria === 'OTRA CATEGORÍA FIJA' || categoria === 'OTRA CATEGORÍA VARIABLE';

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
    setShowDescSuggestions(false);
    setDescActiveIndex(-1);
    setShowAddModal(true);
  };

  const monthScopedEgresos = useMemo(() => {
    if (selectedMonth === 'ALL') return egresos;
    return egresos.filter(e => (e.fecha || '').slice(0, 7) === selectedMonth);
  }, [egresos, selectedMonth]);

  const egresosSummary = useMemo(() => {
    const list = monthScopedEgresos;
    const total = list.reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const fijos = list.filter(e => e.tipo === 'FIJO').reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const variables = list.filter(e => e.tipo === 'VARIABLE').reduce((sum, e) => sum + Number(e.monto || 0), 0);

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

  const filteredEgresos = useMemo(() => {
    return egresos.filter((e) => {
      if (selectedMonth !== 'ALL') {
        const ym = (e.fecha || '').slice(0, 7);
        if (ym !== selectedMonth) return false;
      }

      if (searchDescription.trim()) {
        const query = searchDescription.toLowerCase().trim();
        const desc = (e.descripcion || '').toLowerCase();
        if (!desc.includes(query)) return false;
      }

      if (selectedCategoria !== 'ALL' && (e.categoria || '').toUpperCase().trim() !== selectedCategoria) {
        return false;
      }

      if (selectedTipo !== 'ALL' && e.tipo !== selectedTipo) {
        return false;
      }

      return true;
    });
  }, [egresos, selectedMonth, searchDescription, selectedCategoria, selectedTipo]);

  const egresosTotalPages = Math.ceil(filteredEgresos.length / egresosPageSize) || 1;
  const paginatedEgresos = useMemo(() => {
    const start = (egresosPage - 1) * egresosPageSize;
    return filteredEgresos.slice(start, start + egresosPageSize);
  }, [filteredEgresos, egresosPage]);

  // Total sum of filtered egresos (Sumador)
  const filteredEgresosTotal = useMemo(() => {
    return filteredEgresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);
  }, [filteredEgresos]);

  // Overall Financial Balance for the selected month
  const balanceNeto = useMemo(() => {
    const ing = ingresosSummary.total;
    const egr = egresosSummary.total;
    const neto = ing - egr;
    const margen = ing > 0 ? Math.round((neto / ing) * 100) : 0;
    return { ing, egr, neto, margen };
  }, [ingresosSummary, egresosSummary]);

  // Memory of all unique expense concepts registered in Supabase
  const egresosMemory = useMemo(() => {
    const memoryMap = new Map<string, {
      displayDesc: string;
      categoria: string;
      tipo: TipoEgreso;
      monto: number;
      count: number;
      fechaUltimo: string;
    }>();

    // Sort ascending by date so newer records update the casing & latest habitual amount
    const sorted = [...egresos].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

    sorted.forEach((e) => {
      const raw = (e.descripcion || '').trim();
      if (!raw) return;
      const key = raw.toLowerCase();

      const existing = memoryMap.get(key);
      if (!existing) {
        memoryMap.set(key, {
          displayDesc: raw,
          categoria: e.categoria || 'OTROS',
          tipo: (e.tipo as TipoEgreso) || 'VARIABLE',
          monto: Number(e.monto || 0),
          count: 1,
          fechaUltimo: e.fecha || ''
        });
      } else {
        existing.count += 1;
        existing.displayDesc = raw; // keep latest casing
        if (e.categoria) existing.categoria = e.categoria;
        if (e.tipo) existing.tipo = e.tipo as TipoEgreso;
        if (Number(e.monto) > 0) existing.monto = Number(e.monto);
        if (e.fecha) existing.fechaUltimo = e.fecha;
      }
    });

    return Array.from(memoryMap.values()).sort((a, b) => b.count - a.count);
  }, [egresos]);

  // Live matching suggestions for description input
  const descSuggestions = useMemo(() => {
    const q = (descripcion || '').trim().toLowerCase();
    if (!q) {
      // Return top 5 most frequent concepts when input is empty
      return egresosMemory.slice(0, 5);
    }
    return egresosMemory
      .filter(item => item.displayDesc.toLowerCase().includes(q))
      .slice(0, 8);
  }, [egresosMemory, descripcion]);

  const handleSelectDescSuggestion = (item: {
    displayDesc: string;
    categoria: string;
    tipo: TipoEgreso;
    monto: number;
  }) => {
    setDescripcion(item.displayDesc);

    // Auto-select corresponding Tipo & Category
    if (item.tipo === 'FIJO' || item.tipo === 'VARIABLE') {
      setTipo(item.tipo);
      const catList = item.tipo === 'FIJO' ? CATEGORIAS_FIJAS : CATEGORIAS_VARIABLES;
      const found = catList.find(c => c.id.toUpperCase() === item.categoria.toUpperCase());
      if (found) {
        setCategoria(found.id);
        setCustomCategoria('');
      } else {
        setCategoria(item.tipo === 'FIJO' ? 'OTRA CATEGORÍA FIJA' : 'OTRA CATEGORÍA VARIABLE');
        setCustomCategoria(item.categoria);
      }
    }

    // Auto-fill amount if current amount is empty or 0
    if ((!monto || parseFloat(monto) <= 0) && item.monto > 0) {
      setMonto(item.monto.toFixed(2));
      toast.info(`Monto sugerido aplicado: S/ ${item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, {
        duration: 3000
      });
    }

    setShowDescSuggestions(false);
    setDescActiveIndex(-1);
  };

  const handleSubmitEgreso = async (e: React.FormEvent) => {
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
        setShowDescSuggestions(false);
        setDescActiveIndex(-1);
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

  // Handler for confirming payment deletion and quota reversal
  const handleConfirmDeletePago = async () => {
    if (!pagoToDelete) return;
    setIsDeletingPago(true);
    try {
      const res = await eliminarPago(pagoToDelete.id);
      if (res.success) {
        toast.success('Pago anulado exitosamente', {
          description: `Se eliminó el pago de S/ ${Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })} y se actualizó la cuota en el contrato.`
        });
        setPagoToDelete(null);
      } else {
        toast.error('Error al anular pago', {
          description: res.error || 'No se pudo anular el pago en Supabase.'
        });
      }
    } catch (err: any) {
      toast.error('Error', {
        description: err?.message || 'Error inesperado al anular el pago.'
      });
    } finally {
      setIsDeletingPago(false);
    }
  };

  // Badge for payment methods
  const renderMethodBadge = (metodo: MetodoPago | string) => {
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
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200">
            {metodo}
          </span>
        );
    }
  };

  // Badge for expense categories
  const renderCategoryBadge = (categoria: string) => {
    const cat = (categoria || 'OTROS').toUpperCase().trim();
    switch (cat) {
      case 'INFRAESTRUCTURA Y SERVICIO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            INFRAESTRUCTURA Y SERVICIO
          </span>
        );
      case 'SUELDOS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            SUELDOS
          </span>
        );
      case 'RECREATIVO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
            RECREATIVO
          </span>
        );
      case 'MOVILIDAD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            MOVILIDAD
          </span>
        );
      case 'CAMPAÑA':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            CAMPAÑA
          </span>
        );
      case 'COMISIONES':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            COMISIONES
          </span>
        );
      case 'MANTENIMIENTO Y SUMINISTRO':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            MANTENIMIENTO Y SUMINISTRO
          </span>
        );
      case 'OTROS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            OTROS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[200px]" title={cat}>
            {cat}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Caja Chica &amp; Flujo de Fondos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {pagos.length} Ingresos • {egresos.length} Egresos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supervisión integral de recaudación por abonos, gastos operativos y balance neto de tesorería
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refreshPagos(); refreshEgresos(); }}
            disabled={loadingPagos || loadingEgresos}
            title="Recargar datos de Supabase"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPagos || loadingEgresos ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={handleOpenModal}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Egreso</span>
          </button>
        </div>
      </div>

      {/* Month Filter Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-slate-700">Periodo Contable:</span>
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setIngresosPage(1);
              setEgresosPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer transition-colors"
          >
            <option value="ALL">Todos los Meses (Consolidado Histórico)</option>
            {availableMonths.map(m => (
              <option key={m.value} value={m.value}>
                {m.label} ({m.pagosCount} ingresos • {m.egresosCount} egresos)
              </option>
            ))}
          </select>
        </div>

        {selectedMonth !== 'ALL' && (
          <button
            onClick={() => { setSelectedMonth('ALL'); setIngresosPage(1); setEgresosPage(1); }}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer underline self-end sm:self-auto"
          >
            Ver consolidado anual
          </button>
        )}
      </div>

      {/* Sub-Tabs Switcher */}
      <div className="flex items-center border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('flujo')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'flujo'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Flujo de Fondos (Balance Neto)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ingresos')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'ingresos'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          <span>Ingresos &amp; Recaudación ({filteredPagos.length} pagos)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('egresos')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer flex items-center gap-2 border-b-2 ${
            activeSubTab === 'egresos'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-rose-600" />
          <span>Egresos Operativos ({filteredEgresos.length} gastos)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: FLUJO DE FONDOS (BALANCE NETO COMPARATIVO)          */}
      {/* ============================================================== */}
      {activeSubTab === 'flujo' && (
        <div className="space-y-4">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Ingresos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Total Ingresos ({formatMonthLabel(selectedMonth)})
                </span>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-emerald-700 tracking-tight">
                  S/ {balanceNeto.ing.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  {ingresosSummary.count} transacciones de cobranza
                </p>
              </div>
            </div>

            {/* Total Egresos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Total Egresos ({formatMonthLabel(selectedMonth)})
                </span>
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-rose-700 tracking-tight">
                  S/ {balanceNeto.egr.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  {egresosSummary.count} movimientos operativos
                </p>
              </div>
            </div>

            {/* Superávit / Balance Neto */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Superávit / Balance Neto
                </span>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${
                  balanceNeto.neto >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className={`text-2xl font-bold tracking-tight ${
                  balanceNeto.neto >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  S/ {balanceNeto.neto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  {balanceNeto.neto >= 0 ? 'Flujo de caja positivo' : 'Déficit operativo temporal'}
                </p>
              </div>
            </div>

            {/* Margen Operativo */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Margen Operativo
                </span>
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {balanceNeto.margen}%
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Retención de liquidez sobre recaudación
                </p>
              </div>
            </div>
          </div>

          {/* Comparative Cashflow BarChart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Comparativa Mensual de Ingresos vs Egresos {availableMonths.length > 0 ? `(${availableMonths[availableMonths.length - 1].value.slice(0, 4)}${availableMonths[0].value.slice(0, 4) !== availableMonths[availableMonths.length - 1].value.slice(0, 4) ? ` - ${availableMonths[0].value.slice(0, 4)}` : ''})` : ''}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Consolidado de los {availableMonths.length} meses registrados en Supabase {availableMonths.length > 0 ? `(${availableMonths[availableMonths.length - 1].label} a ${availableMonths[0].label})` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                  <span className="text-slate-600">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span className="text-slate-600">Egresos</span>
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativeChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `S/${(val / 1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    formatter={(val: any, name: any) => [`S/ ${Number(val).toLocaleString('es-PE')}`, name === 'ingresos' ? 'Ingresos (Pagos)' : 'Egresos (Gastos)']}
                    labelFormatter={(label, p) => p?.[0]?.payload?.mesFull || label}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown Table by Month */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-900">
                Resumen Contable por Periodo Mensual
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Periodo</th>
                    <th className="px-4 py-3 text-right">Recaudación (Ingresos)</th>
                    <th className="px-4 py-3 text-right">N° Pagos</th>
                    <th className="px-4 py-3 text-right">Gastos (Egresos)</th>
                    <th className="px-4 py-3 text-right">N° Gastos</th>
                    <th className="px-4 py-3 text-right">Balance Neto</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {availableMonths.map((m) => {
                    const balance = m.pagosTotal - m.egresosTotal;
                    const isPositive = balance >= 0;

                    return (
                      <tr 
                        key={m.value} 
                        onClick={() => { setSelectedMonth(m.value); }}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedMonth === m.value ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {m.label}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          S/ {m.pagosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {m.pagosCount} pagos
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-rose-700 whitespace-nowrap">
                          S/ {m.egresosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {m.egresosCount} egresos
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPositive ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Superávit
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Déficit
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: INGRESOS & RECAUDACIÓN (710 PAGOS SUPABASE)         */}
      {/* ============================================================== */}
      {activeSubTab === 'ingresos' && (
        <div className="space-y-4">
          {/* Ingresos KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Recaudación Total */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Recaudación {formatMonthLabel(selectedMonth)}
                </span>
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-emerald-700 tracking-tight">
                  S/ {ingresosSummary.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  {ingresosSummary.count} transacciones registradas
                </p>
              </div>
            </div>

            {/* Banco BCP */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Abonos BCP
                </span>
                <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-blue-700 tracking-tight">
                  S/ {(ingresosSummary.byMethod['BCP'] || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Transferencias y ventanilla BCP
                </p>
              </div>
            </div>

            {/* Interbank & Banbif */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Interbank &amp; Banbif
                </span>
                <div className="w-7 h-7 rounded-md bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  S/ {((ingresosSummary.byMethod['INTERBANK'] || 0) + (ingresosSummary.byMethod['BANBIF'] || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cuentas recaudadoras alternas
                </p>
              </div>
            </div>

            {/* Yape & Efectivo */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Yape &amp; Efectivo
                </span>
                <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <span className="text-2xl font-bold text-purple-700 tracking-tight">
                  S/ {((ingresosSummary.byMethod['YAPE'] || 0) + (ingresosSummary.byMethod['EFECTIVO'] || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Billetera digital y caja presencial
                </p>
              </div>
            </div>
          </div>

          {/* Month Badges Quick Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => { setSelectedMonth('ALL'); setIngresosPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                selectedMonth === 'ALL'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Todos los Meses ({pagos.length})
            </button>
            {availableMonths.map(m => (
              <button
                key={m.value}
                onClick={() => { setSelectedMonth(m.value); setIngresosPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  selectedMonth === m.value
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{m.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedMonth === m.value ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700 font-semibold'
                }`}>
                  {m.pagosCount}
                </span>
              </button>
            ))}
          </div>

          {/* Table Controls (Search & Method Filter) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Payment Method Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
              {['ALL', 'BCP', 'INTERBANK', 'BANBIF', 'YAPE', 'EFECTIVO'].map((metodo) => (
                <button
                  key={metodo}
                  onClick={() => { setIngresosMethod(metodo); setIngresosPage(1); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                    ingresosMethod === metodo ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {metodo === 'ALL' ? 'Todos' : metodo}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={ingresosSearch}
                onChange={(e) => { setIngresosSearch(e.target.value); setIngresosPage(1); }}
                placeholder="Buscar por N° Operación, titular o contrato..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Live Sumador / Accumulator Banner for Ingresos */}
          <div className="bg-linear-to-r from-emerald-50/70 via-white to-slate-50/60 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Sumador de Ingresos
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {filteredPagos.length} {filteredPagos.length === 1 ? 'pago' : 'pagos'}
                  </span>
                  {ingresosMethod !== 'ALL' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Canal: {ingresosMethod}
                    </span>
                  )}
                  {ingresosSearch.trim() && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <span>Búsqueda: "{ingresosSearch}"</span>
                      <button
                        onClick={() => { setIngresosSearch(''); setIngresosPage(1); }}
                        className="hover:text-amber-950 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedMonth === 'ALL' ? 'Total recaudado en todo el historial' : `Total recaudado en el periodo ${formatMonthLabel(selectedMonth)}`}
                  {ingresosSearch.trim() || ingresosMethod !== 'ALL' ? ' con los filtros activos' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 sm:border-l sm:border-emerald-200/60 sm:pl-5">
              <div className="text-left sm:text-right">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Monto Total Recaudado
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                  S/ {filteredPagosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {(ingresosSearch.trim() || ingresosMethod !== 'ALL') && (
                <button
                  onClick={() => {
                    setIngresosSearch('');
                    setIngresosMethod('ALL');
                    setIngresosPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs cursor-pointer transition-colors"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>

          {/* Pagos Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Fecha de Pago</th>
                    <th className="px-4 py-3">N° Operación / Voucher</th>
                    <th className="px-4 py-3">Titular / Cliente</th>
                    <th className="px-4 py-3">Contrato Asignado</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3">Canal / Banco</th>
                    <th className="px-4 py-3 text-right">Monto Recaudado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingPagos ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-500">Cargando registros reales de pagos desde Supabase...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPagos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No se encontraron pagos con los filtros seleccionados
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Verifica el mes seleccionado o cambia el término de búsqueda
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedPagos.map((pago) => (
                      <tr key={pago.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">
                            {pago.fecha_pago}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatMonthLabel((pago.fecha_pago || '').slice(0, 7))}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {pago.numero_operacion}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800 text-xs block truncate max-w-[200px]">
                            {pago.propietario || 'Ingreso Directo'}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-700 font-medium">
                            {pago.codigo_contrato || 'S/A'}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">
                            {pago.tipo_pago || 'CUOTAS MENSUALES'}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderMethodBadge(pago.metodo_pago)}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-emerald-700 text-xs">
                          S/ {Number(pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedVoucher(pago)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-xs"
                              title="Ver comprobante de pago"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Voucher</span>
                            </button>
                            <button
                              onClick={() => setPagoToDelete(pago)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shadow-xs"
                              title="Anular pago y revertir cuota en contrato"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Anular</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Official Table Foot with Live Total */}
                {filteredPagos.length > 0 && (
                  <tfoot className="bg-slate-50/90 font-semibold text-slate-900 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-600">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Calculator className="w-3.5 h-3.5 text-slate-500" />
                          <span>Total Recaudación Filtrada ({filteredPagos.length} {filteredPagos.length === 1 ? 'pago' : 'pagos'}):</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-black text-emerald-700 text-sm">
                        S/ {filteredPagosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Página <b>{ingresosPage}</b> de <b>{ingresosTotalPages}</b></span>
                <span className="text-slate-300">•</span>
                <span>Total <b>{filteredPagos.length}</b> pagos mostrados</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/70 text-xs">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Suma Total: S/ {filteredPagosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIngresosPage(prev => Math.max(1, prev - 1))}
                  disabled={ingresosPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIngresosPage(prev => Math.min(ingresosTotalPages, prev + 1))}
                  disabled={ingresosPage >= ingresosTotalPages}
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
      {/* SUB-TAB 3: EGRESOS OPERATIVOS (497 GASTOS SUPABASE)            */}
      {/* ============================================================== */}
      {activeSubTab === 'egresos' && (
        <div className="space-y-4">
          {/* Egresos Error Banner */}
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

          {/* Egresos KPI Cards */}
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
                <span className="text-xl font-bold text-slate-900">
                  S/ {egresosSummary.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {egresosSummary.count} movimientos operativos en Supabase
                </p>
              </div>
            </div>

            {/* Egresos Fijos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Costos Fijos (Planilla / Local)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                  Fijo
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-slate-900">
                  S/ {egresosSummary.fijos.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {egresosSummary.total > 0 ? `${Math.round((egresosSummary.fijos / egresosSummary.total) * 100)}% del total` : '0%'}
                </p>
              </div>
            </div>

            {/* Egresos Variables */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Gastos Variables (Marketing / Obras)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
                  Variable
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-amber-700">
                  S/ {egresosSummary.variables.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {egresosSummary.total > 0 ? `${Math.round((egresosSummary.variables / egresosSummary.total) * 100)}% del total` : '0%'}
                </p>
              </div>
            </div>
          </div>

          {/* Categories Breakdown */}
          {egresosSummary.categoriesBreakdown.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <PieIcon className="w-3.5 h-3.5 text-slate-400" />
                  Distribución por Categorías ({formatMonthLabel(selectedMonth)})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {egresosSummary.categoriesBreakdown.slice(0, 8).map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedCategoria(prev => prev === cat.categoria ? 'ALL' : cat.categoria);
                      setEgresosPage(1);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      selectedCategoria === cat.categoria
                        ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                        {cat.categoria}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {cat.porcentaje}%
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        S/ {cat.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Egresos Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
                <button
                  onClick={() => { setSelectedTipo('ALL'); setEgresosPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    selectedTipo === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => { setSelectedTipo('FIJO'); setEgresosPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    selectedTipo === 'FIJO' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Fijos
                </button>
                <button
                  onClick={() => { setSelectedTipo('VARIABLE'); setEgresosPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    selectedTipo === 'VARIABLE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Variables
                </button>
              </div>

              {/* Category Dropdown Filter */}
              <select
                value={selectedCategoria}
                onChange={(e) => {
                  setSelectedCategoria(e.target.value);
                  setEgresosPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="ALL">Todas las Categorías</option>
                <optgroup label="Gastos Fijos">
                  <option value="INFRAESTRUCTURA Y SERVICIO">INFRAESTRUCTURA Y SERVICIO</option>
                  <option value="SUELDOS">SUELDOS</option>
                </optgroup>
                <optgroup label="Gastos Variables">
                  <option value="RECREATIVO">RECREATIVO</option>
                  <option value="MOVILIDAD">MOVILIDAD</option>
                  <option value="CAMPAÑA">CAMPAÑA</option>
                  <option value="COMISIONES">COMISIONES</option>
                  <option value="MANTENIMIENTO Y SUMINISTRO">MANTENIMIENTO Y SUMINISTRO</option>
                  <option value="OTROS">OTROS</option>
                </optgroup>
              </select>

              {selectedCategoria !== 'ALL' && (
                <button
                  onClick={() => {
                    setSelectedCategoria('ALL');
                    setEgresosPage(1);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-colors"
                >
                  <span>Filtro: {selectedCategoria}</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchDescription}
                onChange={(e) => { setSearchDescription(e.target.value); setEgresosPage(1); }}
                placeholder="Buscar por concepto o proveedor..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Live Sumador / Accumulator Banner */}
          <div className="bg-linear-to-r from-rose-50/70 via-white to-slate-50/60 border border-rose-200/80 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100/80 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    Sumador de Egresos
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {filteredEgresos.length} {filteredEgresos.length === 1 ? 'egreso' : 'egresos'}
                  </span>
                  {selectedTipo !== 'ALL' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Tipo: {selectedTipo}
                    </span>
                  )}
                  {selectedCategoria !== 'ALL' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Cat: {selectedCategoria}
                    </span>
                  )}
                  {searchDescription.trim() && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <span>Búsqueda: "{searchDescription}"</span>
                      <button
                        onClick={() => { setSearchDescription(''); setEgresosPage(1); }}
                        className="hover:text-amber-950 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedMonth === 'ALL' ? 'Total acumulado en todo el historial' : `Total acumulado en el periodo ${formatMonthLabel(selectedMonth)}`}
                  {searchDescription.trim() || selectedTipo !== 'ALL' || selectedCategoria !== 'ALL' ? ' con los filtros activos' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 sm:border-l sm:border-rose-200/60 sm:pl-5">
              <div className="text-left sm:text-right">
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Monto Total Filtrado
                </span>
                <span className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                  S/ {filteredEgresosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {(searchDescription.trim() || selectedTipo !== 'ALL' || selectedCategoria !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchDescription('');
                    setSelectedTipo('ALL');
                    setSelectedCategoria('ALL');
                    setEgresosPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs cursor-pointer transition-colors"
                >
                  Restablecer
                </button>
              )}
            </div>
          </div>

          {/* Egresos Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Categoría</th>
                    <th className="px-4 py-3">Descripción / Concepto</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loadingEgresos ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-slate-500">Cargando egresos desde Supabase...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEgresos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          No se encontraron egresos registrados
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Intenta modificar los filtros o el periodo seleccionado
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEgresos.map((egr) => (
                      <tr key={egr.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">
                          {egr.fecha}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {egr.tipo === 'FIJO' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              FIJO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              VARIABLE
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderCategoryBadge(egr.categoria)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {highlightMatch(egr.descripcion, searchDescription)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-rose-700 text-xs">
                          S/ {Number(egr.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Official Table Foot with Live Total */}
                {filteredEgresos.length > 0 && (
                  <tfoot className="bg-slate-50/90 font-semibold text-slate-900 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-wider text-slate-600">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Calculator className="w-3.5 h-3.5 text-slate-500" />
                          <span>Total Sumatoria ({filteredEgresos.length} {filteredEgresos.length === 1 ? 'egreso' : 'egresos'}):</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap font-black text-rose-700 text-sm">
                        S/ {filteredEgresosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Página <b>{egresosPage}</b> de <b>{egresosTotalPages}</b></span>
                <span className="text-slate-300">•</span>
                <span>Total <b>{filteredEgresos.length}</b> egresos</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold border border-rose-200/70 text-xs">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Suma Total: S/ {filteredEgresosTotal.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEgresosPage(prev => Math.max(1, prev - 1))}
                  disabled={egresosPage === 1}
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEgresosPage(prev => Math.min(egresosTotalPages, prev + 1))}
                  disabled={egresosPage >= egresosTotalPages}
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
      {/* MODAL: REGISTRAR NUEVO EGRESO                                  */}
      {/* ============================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-scaleIn">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">Registrar Nuevo Egreso Operativo</h3>
                  <p className="text-[11px] text-slate-500">Se registrará directamente en la tabla <code className="font-mono text-emerald-600">egresos</code> de Supabase</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEgreso} className="p-5 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Selector Tipo */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Tipo de Gasto <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
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
                    <span>GASTOS FIJOS</span>
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
                    <span>GASTOS VARIABLES</span>
                  </button>
                </div>
              </div>

              {/* 2. Categoría Dependiente */}
              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Categoría ({tipo === 'FIJO' ? 'Gastos Fijos' : 'Gastos Variables'}) <span className="text-rose-500">*</span>
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

                {currentCategoryDef && !isOtherCategory && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                    <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span><b>Incluye:</b> {currentCategoryDef.hint}</span>
                  </p>
                )}

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

              {/* 4. Descripción o Concepto con Memoria Inteligente de la BD */}
              <div className="relative" ref={descContainerRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-medium text-[11px]">
                    Descripción o Concepto <span className="text-rose-500">*</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 font-medium">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                    <span>Memoria ({egresosMemory.length} conceptos)</span>
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={descripcion}
                    onChange={(e) => {
                      setDescripcion(e.target.value);
                      setShowDescSuggestions(true);
                      setDescActiveIndex(-1);
                    }}
                    onFocus={() => setShowDescSuggestions(true)}
                    onKeyDown={(e) => {
                      if (!showDescSuggestions || descSuggestions.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setDescActiveIndex(prev => (prev + 1) % descSuggestions.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setDescActiveIndex(prev => (prev - 1 + descSuggestions.length) % descSuggestions.length);
                      } else if (e.key === 'Enter' && descActiveIndex >= 0) {
                        e.preventDefault();
                        handleSelectDescSuggestion(descSuggestions[descActiveIndex]);
                      } else if (e.key === 'Escape') {
                        setShowDescSuggestions(false);
                      }
                    }}
                    placeholder="Ej: SUELDO SANDRA, PAGO LUZ, ALQUILER OFICINA..."
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    required
                    autoComplete="off"
                  />
                  {descripcion.trim() && (
                    <button
                      type="button"
                      onClick={() => { setDescripcion(''); setShowDescSuggestions(true); }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Borrar texto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Floating Suggestions Dropdown */}
                {showDescSuggestions && descSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-700">
                        <History className="w-3 h-3 text-emerald-600" />
                        {descripcion.trim() ? 'Recomendaciones en base a la BD:' : 'Gastos frecuentes registrados:'}
                      </span>
                      <span className="text-slate-400">↑ ↓ o clic para auto-llenar</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {descSuggestions.map((item, idx) => {
                        const isSelected = idx === descActiveIndex;
                        return (
                          <button
                            key={`${item.displayDesc}-${idx}`}
                            type="button"
                            onClick={() => handleSelectDescSuggestion(item)}
                            onMouseEnter={() => setDescActiveIndex(idx)}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                              isSelected ? 'bg-emerald-50/90 text-emerald-950' : 'hover:bg-slate-50/90 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 truncate">
                                <span>{highlightMatch(item.displayDesc, descripcion)}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                                <span className={`px-1.5 py-0.2 rounded font-semibold text-[9px] ${
                                  item.tipo === 'FIJO' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {item.tipo}
                                </span>
                                <span>•</span>
                                <span className="text-emerald-700 font-medium">{item.categoria}</span>
                                <span>•</span>
                                <span className="text-slate-400">{item.count} {item.count === 1 ? 'registro' : 'registros'}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              {item.monto > 0 && (
                                <span className="text-xs font-bold text-rose-700 block">
                                  S/ {item.monto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 block font-normal">
                                habitual
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. Monto en Soles */}
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

      {/* Voucher Modal */}
      {selectedVoucher && (
        <VoucherModal
          pago={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
        />
      )}

      {/* Delete / Anular Pago Confirmation Modal */}
      {pagoToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Anular y Eliminar Pago
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Confirmación de anulación de ingreso
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isDeletingPago && setPagoToDelete(null)}
                disabled={isDeletingPago}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>N° Operación:</span>
                  <span className="font-mono font-bold text-slate-900">{pagoToDelete.numero_operacion || 'S/N'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Titular:</span>
                  <span className="font-medium text-slate-900 text-right">{pagoToDelete.propietario || 'Ingreso Directo'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Contrato:</span>
                  <span className="font-mono font-medium text-slate-900">{pagoToDelete.codigo_contrato || 'S/A'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Monto Abonado:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    S/ {Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Fecha de Pago:</span>
                  <span className="text-slate-800">{pagoToDelete.fecha_pago}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Canal / Banco:</span>
                  <span className="font-semibold text-slate-800">{pagoToDelete.metodo_pago}</span>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Impacto de la anulación en el sistema:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1">
                  <li>Se eliminará permanentemente de la tabla <b>pagos</b> en Supabase.</li>
                  <li>Se <b>restará la cuota</b> en el contrato (<code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">cuotas_pagadas_base</code>).</li>
                  <li>Se <b>restablecerá la deuda</b> pendiente por S/ {Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}.</li>
                  <li>El contrato volverá a estado ACTIVO en caso estuviera liquidado.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPagoToDelete(null)}
                  disabled={isDeletingPago}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePago}
                  disabled={isDeletingPago}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingPago ? 'Anulando...' : 'Sí, Anular Pago'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
