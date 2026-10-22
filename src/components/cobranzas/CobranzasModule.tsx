import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useCompany } from '../../context/CompanyContext';
import { ControlCobranza } from '../../types/database';
import { calcularMora, nivelMora, MoraInfo } from '../../utils/mora';
import { 
  Search, 
  Download, 
  CreditCard, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building2,
  Calendar,
  UserPlus,
  Wallet,
  Users,
  Hourglass,
  FileSpreadsheet,
  X,
  RotateCcw
} from 'lucide-react';
import { ReporteCuotasVencidasModal } from './ReporteCuotasVencidasModal';

export const CobranzasModule: React.FC = () => {
  const { cobranzas: rawCobranzas, setSelectedContractForPayment, loading, setIsNuevoClienteModalOpen } = useData();

  // Enrich every contract with its overdue info (cuotas vencidas, monto, días de atraso)
  const cobranzas = useMemo(
    () => rawCobranzas.map(c => ({ ...c, mora: calcularMora(c) })),
    [rawCobranzas]
  );
  type CobranzaConMora = ControlCobranza & { mora: MoraInfo };
  const [sortBy, setSortBy] = useState<string>('CONTRATO');
  const { buildWhatsAppMessage } = useCompany();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManzana, setSelectedManzana] = useState<string>('ALL');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
  const [selectedCuotasVencidas, setSelectedCuotasVencidas] = useState<string>('ALL');
  const [isReporteModalOpen, setIsReporteModalOpen] = useState(false);
  const [reporteInitialCuotas, setReporteInitialCuotas] = useState(3);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Extract unique manzanas and etapas for filter dropdowns
  const uniqueManzanas = useMemo(() => {
    const set = new Set<string>();
    cobranzas.forEach(c => {
      if (c.manzana) set.add(c.manzana.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [cobranzas]);

  const uniqueEtapas = useMemo(() => {
    const set = new Set<number>();
    cobranzas.forEach(c => {
      if (c.etapa) set.add(Number(c.etapa));
    });
    return Array.from(set).sort();
  }, [cobranzas]);

  // Filtered cobranzas
  const filteredCobranzas = useMemo<CobranzaConMora[]>(() => {
    let list = cobranzas.filter((c) => {
      // 1. Search term (DNI, Nombre, Contrato)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDni = c.dni?.toLowerCase().includes(q);
        const matchNombre = c.propietario?.toLowerCase().includes(q);
        const matchContrato = c.codigo_contrato?.toLowerCase().includes(q);
        if (!matchDni && !matchNombre && !matchContrato) return false;
      }

      // 2. Manzana
      if (selectedManzana !== 'ALL') {
        if (c.manzana?.toUpperCase().trim() !== selectedManzana) return false;
      }

      // 3. Etapa
      if (selectedEtapa !== 'ALL') {
        if (String(c.etapa) !== selectedEtapa) return false;
      }

      // 4. Estado / Situación
      if (selectedEstado !== 'ALL') {
        if (selectedEstado === 'AL DIA') {
          if (c.estado_cobranza !== 'AL DIA') return false;
        } else if (selectedEstado === 'POR VENCER') {
          if (c.estado_cobranza !== 'POR VENCER' && c.estado_cobranza !== 'VENCE HOY') return false;
        } else if (selectedEstado === 'EN MORA') {
          if (c.estado_cobranza !== 'EN MORA') return false;
        } else if (selectedEstado === 'LIQUIDADO') {
          if (c.estado_cobranza !== 'LIQUIDADO' && c.saldo_restante !== 0) return false;
        }
      }

      // 5. Cuotas Vencidas Filter
      if (selectedCuotasVencidas !== 'ALL') {
        const minVenc = parseInt(selectedCuotasVencidas, 10);
        if (minVenc === 0) {
          if (c.mora.cuotasVencidas > 0) return false;
        } else {
          if (c.mora.cuotasVencidas < minVenc) return false;
        }
      }

      return true;
    });

    if (sortBy === 'MORA_CUOTAS') {
      list = [...list].sort((a, b) => b.mora.cuotasVencidas - a.mora.cuotasVencidas || b.mora.montoVencido - a.mora.montoVencido);
    } else if (sortBy === 'MORA_MONTO') {
      list = [...list].sort((a, b) => b.mora.montoVencido - a.mora.montoVencido);
    } else if (sortBy === 'MORA_DIAS') {
      list = [...list].sort((a, b) => b.mora.diasAtraso - a.mora.diasAtraso);
    }
    return list;
  }, [cobranzas, searchTerm, selectedManzana, selectedEtapa, selectedEstado, selectedCuotasVencidas, sortBy]);

  // Mora KPIs over the complete portfolio
  const moraStats = useMemo(() => {
    const enMora = cobranzas.filter(c => c.mora.cuotasVencidas > 0);
    return {
      contratos: enMora.length,
      cuotas: enMora.reduce((s, c) => s + c.mora.cuotasVencidas, 0),
      monto: enMora.reduce((s, c) => s + c.mora.montoVencido, 0),
      graves: enMora.filter(c => c.mora.cuotasVencidas >= 4).length
    };
  }, [cobranzas]);

  // Paginated records
  const totalPages = Math.ceil(filteredCobranzas.length / pageSize) || 1;
  const paginatedCobranzas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCobranzas.slice(start, start + pageSize);
  }, [filteredCobranzas, currentPage, pageSize]);

  // Format Due Date
  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return '30 Oct 2026';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
        const mIdx = parseInt(parts[1], 10) - 1;
        return `${parts[2]} de ${months[mIdx] || parts[1]} de ${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'Código Contrato',
      'DNI Titular',
      'Propietario',
      'Teléfono',
      'Etapa',
      'Manzana',
      'Lote',
      'Precio Venta (S/)',
      'Monto Inicial (S/)',
      'Total Cuotas',
      'Cuota Mensual (S/)',
      'Cuotas Pagadas',
      'Cuotas Pendientes',
      'Saldo Restante (S/)',
      'Próxima Cuota N°',
      'Próximo Vencimiento',
      'Cuotas Vencidas',
      'N° Cuotas Vencidas',
      'Monto Vencido (S/)',
      'Días de Atraso',
      'Estado Cobranza'
    ];

    const rows = filteredCobranzas.map(c => [
      `"${c.codigo_contrato}"`,
      `"${c.dni}"`,
      `"${c.propietario}"`,
      `"${c.telefono}"`,
      c.etapa,
      `"${c.manzana}"`,
      `"${c.numero_lote}"`,
      c.precio_venta,
      c.monto_inicial,
      c.total_cuotas,
      c.monto_cuota,
      c.cuotas_pagadas,
      c.cuotas_pendientes,
      c.saldo_restante,
      c.proximo_numero_cuota,
      `"${c.proximo_vencimiento}"`,
      c.mora.cuotasVencidas,
      `"${c.mora.numerosCuotas.join(' - ')}"`,
      c.mora.montoVencido.toFixed(2),
      c.mora.diasAtraso,
      `"${c.estado_cobranza || (c.saldo_restante === 0 ? 'LIQUIDADO' : 'AL DIA')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Padron_Cobranzas_Ecosol_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // WhatsApp reminder message builder
  const getWhatsAppUrl = (c: ControlCobranza) => {
    const cleanPhone = (c.telefono || '').replace(/[^0-9]/g, '');
    const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
    const msg = buildWhatsAppMessage({
      cliente: c.propietario,
      cuota: c.proximo_numero_cuota || (c.cuotas_pagadas + 1),
      monto: Number(c.monto_cuota).toLocaleString('es-PE', { minimumFractionDigits: 2 }),
      manzana: c.manzana,
      lote: c.numero_lote,
      contrato: c.codigo_contrato,
      fecha: formatDueDate(c.proximo_vencimiento)
    });
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Overdue (mora) cell: cuotas vencidas, monto adeudado y días de atraso
  const renderMoraCell = (c: CobranzaConMora) => {
    const { cuotasVencidas, montoVencido, diasAtraso, numerosCuotas } = c.mora;
    const nivel = nivelMora(cuotasVencidas);
    if (!nivel) {
      return <span className="text-[11px] text-slate-400">Sin deuda vencida</span>;
    }
    const styles = {
      leve: 'bg-amber-50 text-amber-700 border-amber-200',
      moderada: 'bg-orange-50 text-orange-700 border-orange-200',
      grave: 'bg-rose-50 text-rose-700 border-rose-200'
    }[nivel];
    const rango = numerosCuotas.length > 1
      ? `Cuotas #${numerosCuotas[0]} a #${numerosCuotas[numerosCuotas.length - 1]}`
      : `Cuota #${numerosCuotas[0]}`;
    return (
      <div title={rango}>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${styles}`}>
          <AlertTriangle className="w-3 h-3" />
          Debe {cuotasVencidas} {cuotasVencidas === 1 ? 'cuota' : 'cuotas'}
        </span>
        <div className="text-[11px] font-semibold text-rose-600 mt-1">
          S/ {montoVencido.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-[10px] text-slate-400">
          {diasAtraso} {diasAtraso === 1 ? 'día' : 'días'} de atraso • {rango}
        </div>
      </div>
    );
  };

  // Minimalist status badge
  const renderEstadoBadge = (c: ControlCobranza) => {
    const isLiquidado = c.estado_cobranza === 'LIQUIDADO' || c.saldo_restante === 0 || c.cuotas_pendientes === 0;
    if (isLiquidado) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3 h-3" />
          Liquidado
        </span>
      );
    }

    const est = c.estado_cobranza || 'AL DIA';
    if (est === 'EN MORA') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" />
          En Mora
        </span>
      );
    }
    if (est === 'POR VENCER' || est === 'VENCE HOY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" />
          {est === 'VENCE HOY' ? 'Vence Hoy' : 'Por Vencer'}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        Al Día
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Control de Cobranzas
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredCobranzas.length} contratos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión sincronizada en tiempo real con <code className="text-slate-700 font-mono">v_control_cobranzas</code>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNuevoClienteModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nuevo Cliente</span>
          </button>
          <button
            onClick={() => {
              setReporteInitialCuotas(0);
              setIsReporteModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer hover:border-emerald-400"
            title="Generar reporte en Excel: clientes al día, en mora, cuotas pagadas y saldo restante del terreno"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Reporte Cartera & Cobranzas (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Mora KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => { 
            setSelectedCuotasVencidas('1');
            setSelectedEstado('ALL');
            setSortBy('MORA_CUOTAS'); 
            setCurrentPage(1); 
          }}
          className={`text-left border rounded-xl p-4 shadow-xs transition-colors cursor-pointer group ${
            selectedCuotasVencidas === '1' && selectedEstado === 'ALL'
              ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Contratos en Mora</span>
            <Users className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{moraStats.contratos}</p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span className="group-hover:text-rose-600 font-medium">Filtrar tabla</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReporteInitialCuotas(1);
                setIsReporteModalOpen(true);
              }}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline text-[10px] cursor-pointer"
            >
              Excel 1+
            </button>
          </div>
        </div>

        <div 
          onClick={() => {
            setSelectedCuotasVencidas('1');
            setSelectedEstado('ALL');
            setSortBy('MORA_CUOTAS');
            setCurrentPage(1);
          }}
          className="text-left bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-4 shadow-xs transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Cuotas Vencidas</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{moraStats.cuotas}</p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span className="group-hover:text-amber-600 font-medium">Filtrar tabla</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReporteInitialCuotas(3);
                setIsReporteModalOpen(true);
              }}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline text-[10px] cursor-pointer"
            >
              Excel 3+
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Monto Vencido</span>
            <Wallet className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-bold text-rose-600 mt-1">
            S/ {moraStats.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">deuda exigible por recuperar</p>
        </div>

        <div
          onClick={() => { 
            setSelectedCuotasVencidas('4'); 
            setSelectedEstado('ALL');
            setSortBy('MORA_DIAS'); 
            setCurrentPage(1); 
          }}
          className={`text-left border rounded-xl p-4 shadow-xs transition-colors cursor-pointer group ${
            selectedCuotasVencidas === '4'
              ? 'bg-rose-50/60 border-rose-400 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Mora Grave (4+ cuotas)</span>
            <Hourglass className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">{moraStats.graves}</p>
          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span className="group-hover:text-rose-600 font-medium">Filtrar tabla</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReporteInitialCuotas(4);
                setIsReporteModalOpen(true);
              }}
              className="text-rose-700 hover:text-rose-800 font-semibold underline text-[10px] cursor-pointer"
            >
              Excel 4+
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 shadow-xs">
        {/* Real-time search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por DNI, Propietario o Contrato..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Cuotas Vencidas Filter */}
        <div>
          <select
            value={selectedCuotasVencidas}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedCuotasVencidas(val);
              if (val !== 'ALL' && val !== '0' && (selectedEstado === 'AL DIA' || selectedEstado === 'LIQUIDADO')) {
                setSelectedEstado('ALL');
              } else if (val === '0' && selectedEstado === 'EN MORA') {
                setSelectedEstado('ALL');
              }
              setCurrentPage(1);
            }}
            className={`w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium transition-colors ${
              selectedCuotasVencidas !== 'ALL'
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-400/30'
                : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">Cuotas: Todas</option>
            <option value="1">1+ cuota vencida (Mora)</option>
            <option value="2">2+ cuotas vencidas</option>
            <option value="3">3+ cuotas vencidas</option>
            <option value="4">4+ cuotas (Grave)</option>
            <option value="6">6+ cuotas (Crítica)</option>
            <option value="0">Al Día (0 cuotas)</option>
          </select>
        </div>

        {/* Manzana Filter */}
        <div>
          <select
            value={selectedManzana}
            onChange={(e) => {
              setSelectedManzana(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas las Mz ({uniqueManzanas.length})</option>
            {uniqueManzanas.map((mz) => (
              <option key={mz} value={mz}>Manzana {mz}</option>
            ))}
          </select>
        </div>

        {/* Etapa Filter */}
        <div>
          <select
            value={selectedEtapa}
            onChange={(e) => {
              setSelectedEtapa(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas las Etapas</option>
            {uniqueEtapas.map((et) => (
              <option key={et} value={String(et)}>Etapa {et}</option>
            ))}
          </select>
        </div>

        {/* Estado Filter: AL DIA, POR VENCER, EN MORA, LIQUIDADO */}
        <div>
          <select
            value={selectedEstado}
            onChange={(e) => {
              setSelectedEstado(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="AL DIA">Al Día</option>
            <option value="POR VENCER">Por Vencer</option>
            <option value="EN MORA">En Mora</option>
            <option value="LIQUIDADO">Liquidado</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="CONTRATO">Ordenar: Código</option>
            <option value="MORA_CUOTAS">Más cuotas vencidas</option>
            <option value="MORA_MONTO">Mayor monto vencido</option>
            <option value="MORA_DIAS">Más días atraso</option>
          </select>
        </div>
      </div>

      {/* Active filters pill bar */}
      {(searchTerm || selectedManzana !== 'ALL' || selectedEtapa !== 'ALL' || selectedEstado !== 'ALL' || selectedCuotasVencidas !== 'ALL') && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Filtros activos:</span>

            {selectedCuotasVencidas !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                <span>Cuotas: {selectedCuotasVencidas === '0' ? 'Al día (0)' : `${selectedCuotasVencidas}+ vencidas`}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedCuotasVencidas('ALL'); setCurrentPage(1); }}
                  className="hover:text-emerald-950 cursor-pointer p-0.5"
                  title="Quitar filtro de cuotas vencidas"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedEstado !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                <span>Estado: {selectedEstado}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedEstado('ALL'); setCurrentPage(1); }}
                  className="hover:text-slate-950 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedManzana !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                <span>Mz {selectedManzana}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedManzana('ALL'); setCurrentPage(1); }}
                  className="hover:text-slate-950 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedEtapa !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                <span>Etapa {selectedEtapa}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedEtapa('ALL'); setCurrentPage(1); }}
                  className="hover:text-slate-950 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                <span>Búsqueda: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="hover:text-slate-950 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedManzana('ALL');
              setSelectedEtapa('ALL');
              setSelectedEstado('ALL');
              setSelectedCuotasVencidas('ALL');
              setCurrentPage(1);
            }}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Restablecer filtros ({filteredCobranzas.length} contratos)</span>
          </button>
        </div>
      )}

      {/* Cobranzas Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Contrato &amp; Lote</th>
                <th className="px-4 py-3">Propietario / Contacto</th>
                <th className="px-4 py-3 w-44">Avance de Cuotas</th>
                <th className="px-4 py-3">Deuda Vencida</th>
                <th className="px-4 py-3">Próximo Vencimiento</th>
                <th className="px-4 py-3 text-right">Cuota</th>
                <th className="px-4 py-3 text-right">Saldo Restante</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-36"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-6 bg-slate-100 rounded w-20 mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedCobranzas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <AlertTriangle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-700">No se encontraron contratos con los filtros aplicados</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pruebe ajustando el término de búsqueda o seleccione otra opción</p>
                  </td>
                </tr>
              ) : (
                paginatedCobranzas.map((c) => {
                  const percent = Math.min(100, Math.round(((c.cuotas_pagadas || 0) / (c.total_cuotas || 1)) * 100));
                  const isLiquidado = c.estado_cobranza === 'LIQUIDADO' || c.saldo_restante === 0;

                  return (
                    <tr key={c.codigo_contrato} className="hover:bg-slate-50/80 transition-colors">
                      {/* Contrato & Lote */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-mono text-xs">
                          {c.codigo_contrato}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>Etapa {c.etapa} • Mz {c.manzana} • Lt {c.numero_lote}</span>
                        </div>
                      </td>

                      {/* Propietario / WhatsApp */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 text-xs truncate max-w-xs">
                          {c.propietario}
                        </div>
                        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-slate-500">
                          <span>DNI {c.dni}</span>
                          {c.telefono && (
                            <a
                              href={getWhatsAppUrl(c)}
                              target="_blank"
                              rel="noreferrer"
                              title="Enviar recordatorio de pago por WhatsApp"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors font-medium text-[10px]"
                            >
                              <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{c.telefono}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Visual Progress Bar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                          <span className="text-slate-600">
                            {c.cuotas_pagadas} de {c.total_cuotas} cuotas
                          </span>
                          <span className="text-slate-800 font-semibold">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLiquidado 
                                ? 'bg-blue-500' 
                                : c.estado_cobranza === 'EN MORA'
                                  ? 'bg-rose-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {c.cuotas_pendientes} cuotas restantes
                        </span>
                      </td>

                      {/* Deuda Vencida (Mora) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderMoraCell(c)}
                      </td>

                      {/* Próxima Cuota & Vencimiento */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isLiquidado ? (
                          <span className="text-slate-400 text-[11px]">Total amortizado</span>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800 text-xs flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Cuota #{c.proximo_numero_cuota || (c.cuotas_pagadas + 1)}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              {formatDueDate(c.proximo_vencimiento)}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Cuota Mensual */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-medium text-slate-900 text-xs block">
                          S/ {Number(c.monto_cuota).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">Inicial: S/ {c.monto_inicial}</span>
                      </td>

                      {/* Saldo Restante */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`font-semibold text-xs block ${isLiquidado ? 'text-blue-600' : 'text-slate-900'}`}>
                          S/ {Number(c.saldo_restante).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">Total: S/ {c.precio_venta}</span>
                      </td>

                      {/* Estado Cobranza Badge */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {renderEstadoBadge(c)}
                      </td>

                      {/* Action Button: Registrar Pago */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedContractForPayment(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Pagar</span>
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
          <div className="flex items-center gap-2">
            <span>Página <b>{currentPage}</b> de <b>{totalPages}</b></span>
            <span>•</span>
            <span>Total: <b>{filteredCobranzas.length}</b> contratos</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-700 text-xs focus:outline-none"
            >
              <option value={15}>15 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reporte de Cuotas Vencidas en Excel Modal */}
      <ReporteCuotasVencidasModal
        isOpen={isReporteModalOpen}
        onClose={() => setIsReporteModalOpen(false)}
        initialMinCuotas={reporteInitialCuotas}
      />
    </div>
  );
};
