import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { ControlCobranza, Cliente, Contrato } from '../../types/database';
import { calcularMora, nivelMora, MoraInfo } from '../../utils/mora';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  Users, 
  Wallet, 
  CheckCircle2, 
  Search, 
  Building2,
  Calendar,
  Mail,
  MapPin,
  Compass,
  Phone,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ReporteCuotasVencidasModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMinCuotas?: number;
}

interface CobranzaEnriquecida extends ControlCobranza {
  mora: MoraInfo;
  clienteDetalle?: Cliente;
  contratoDetalle?: Contrato;
  correo: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  asesor: string;
  valorTerreno: number;
  inicial: number;
  cuotasPagadas: number;
  totalCuotas: number;
  cuotasRestantes: number;
  montoCuota: number;
  restaPorPagar: number;
  totalPagado: number;
  porcentajePagado: number;
  porcentajeRestante: number;
}

type ReportMode = 'ALL' | 'AL_DIA' | 'MORA_1' | 'MORA_2' | 'MORA_3' | 'MORA_4' | 'CUSTOM';

export const ReporteCuotasVencidasModal: React.FC<ReporteCuotasVencidasModalProps> = ({
  isOpen,
  onClose,
  initialMinCuotas = 3
}) => {
  const { cobranzas = [], clientes = [], contratos = [] } = useData();

  // Mode & threshold setup
  const [reportMode, setReportMode] = useState<ReportMode>('MORA_3');
  const [customMinCuotas, setCustomMinCuotas] = useState<number>(3);
  const [operator, setOperator] = useState<'gte' | 'exact'>('gte');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('ALL');
  const [selectedManzana, setSelectedManzana] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'CUOTAS_VENCIDAS_DESC' | 'RESTANTE_DESC' | 'VALOR_DESC' | 'PAGADAS_DESC' | 'NOMBRE_ASC'>('CUOTAS_VENCIDAS_DESC');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync initial configuration when opened
  useEffect(() => {
    if (initialMinCuotas === 0) {
      setReportMode('AL_DIA');
    } else if (initialMinCuotas === 1) {
      setReportMode('MORA_1');
    } else if (initialMinCuotas === 4) {
      setReportMode('MORA_4');
    } else if (initialMinCuotas === 3) {
      setReportMode('MORA_3');
    } else if (initialMinCuotas > 0) {
      setReportMode('CUSTOM');
      setCustomMinCuotas(initialMinCuotas);
    }
  }, [initialMinCuotas, isOpen]);

  // Enrich each contract with full financial calculations and client dossier details
  const enrichedCobranzas = useMemo<CobranzaEnriquecida[]>(() => {
    return cobranzas.map((c) => {
      const mora = calcularMora(c);

      // Find client record by DNI, client_id, or name
      const foundClient = clientes.find((cl) => {
        if (c.dni && cl.dni && cl.dni.trim() === c.dni.trim()) return true;
        if (cl.nombres_apellidos && c.propietario && cl.nombres_apellidos.trim().toLowerCase() === c.propietario.trim().toLowerCase()) return true;
        return false;
      });

      // Find contract record
      const foundContract = contratos.find((ct) => {
        if (ct.codigo_contrato && ct.codigo_contrato === c.codigo_contrato) return true;
        if (String(ct.id) === String(c.contrato_id)) return true;
        return false;
      });

      const cl = foundContract?.cliente || (foundContract as any)?.clientes;

      // Financial computations relative to lot value
      const valorTerreno = Number(c.precio_venta || 0);
      const inicial = Number(c.monto_inicial || 0);
      const cuotasPagadas = Number(c.cuotas_pagadas || 0);
      const totalCuotas = Number(c.total_cuotas || 0);
      const cuotasRestantes = Math.max(0, Number(c.cuotas_pendientes ?? (totalCuotas - cuotasPagadas)));
      const montoCuota = Number(c.monto_cuota || 0);
      const restaPorPagar = Number(c.saldo_restante || 0);
      const totalPagado = Math.max(0, valorTerreno - restaPorPagar);
      const porcentajePagado = valorTerreno > 0 ? (totalPagado / valorTerreno) * 100 : 0;
      const porcentajeRestante = valorTerreno > 0 ? (restaPorPagar / valorTerreno) * 100 : 0;

      return {
        ...c,
        mora,
        clienteDetalle: foundClient,
        contratoDetalle: foundContract,
        correo: foundClient?.correo || cl?.correo || '',
        direccion: foundClient?.direccion || cl?.direccion || '',
        distrito: foundClient?.distrito || cl?.distrito || '',
        provincia: foundClient?.provincia || cl?.provincia || '',
        departamento: foundClient?.departamento || cl?.departamento || '',
        asesor: foundContract?.asesor || '',
        valorTerreno,
        inicial,
        cuotasPagadas,
        totalCuotas,
        cuotasRestantes,
        montoCuota,
        restaPorPagar,
        totalPagado,
        porcentajePagado,
        porcentajeRestante
      };
    });
  }, [cobranzas, clientes, contratos]);

  // Unique manzanas and etapas for filter selects
  const uniqueManzanas = useMemo(() => {
    const set = new Set<string>();
    enrichedCobranzas.forEach((c) => {
      if (c.manzana) set.add(c.manzana.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [enrichedCobranzas]);

  const uniqueEtapas = useMemo(() => {
    const set = new Set<number>();
    enrichedCobranzas.forEach((c) => {
      if (c.etapa) set.add(Number(c.etapa));
    });
    return Array.from(set).sort();
  }, [enrichedCobranzas]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return enrichedCobranzas
      .filter((c) => {
        const cuotas = c.mora.cuotasVencidas;

        // Mode filter: ALL, AL_DIA, MORA_1, MORA_2, MORA_3, MORA_4, CUSTOM
        if (reportMode === 'ALL') {
          // Keep all
        } else if (reportMode === 'AL_DIA') {
          if (cuotas !== 0) return false;
        } else if (reportMode === 'MORA_1') {
          if (cuotas < 1) return false;
        } else if (reportMode === 'MORA_2') {
          if (cuotas < 2) return false;
        } else if (reportMode === 'MORA_3') {
          if (cuotas < 3) return false;
        } else if (reportMode === 'MORA_4') {
          if (cuotas < 4) return false;
        } else if (reportMode === 'CUSTOM') {
          if (operator === 'gte') {
            if (cuotas < customMinCuotas) return false;
          } else {
            if (cuotas !== customMinCuotas) return false;
          }
        }

        // Manzana filter
        if (selectedManzana !== 'ALL' && c.manzana?.toUpperCase().trim() !== selectedManzana) {
          return false;
        }

        // Etapa filter
        if (selectedEtapa !== 'ALL' && String(c.etapa) !== selectedEtapa) {
          return false;
        }

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchDni = c.dni?.toLowerCase().includes(q);
          const matchNombre = c.propietario?.toLowerCase().includes(q);
          const matchContrato = c.codigo_contrato?.toLowerCase().includes(q);
          const matchMz = `mz ${c.manzana}`.toLowerCase().includes(q);
          const matchLt = `lt ${c.numero_lote}`.toLowerCase().includes(q);
          if (!matchDni && !matchNombre && !matchContrato && !matchMz && !matchLt) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'CUOTAS_VENCIDAS_DESC') {
          return b.mora.cuotasVencidas - a.mora.cuotasVencidas || b.mora.montoVencido - a.mora.montoVencido;
        }
        if (sortBy === 'RESTANTE_DESC') {
          return b.restaPorPagar - a.restaPorPagar;
        }
        if (sortBy === 'VALOR_DESC') {
          return b.valorTerreno - a.valorTerreno;
        }
        if (sortBy === 'PAGADAS_DESC') {
          return b.cuotasPagadas - a.cuotasPagadas;
        }
        if (sortBy === 'NOMBRE_ASC') {
          return (a.propietario || '').localeCompare(b.propietario || '');
        }
        return 0;
      });
  }, [enrichedCobranzas, reportMode, customMinCuotas, operator, selectedManzana, selectedEtapa, searchTerm, sortBy]);

  // Aggregate stats over filtered records
  const stats = useMemo(() => {
    const totalContratos = filteredRecords.length;
    const totalValorTerrenos = filteredRecords.reduce((acc, c) => acc + c.valorTerreno, 0);
    const totalPagadoAcumulado = filteredRecords.reduce((acc, c) => acc + c.totalPagado, 0);
    const totalRestaPorPagar = filteredRecords.reduce((acc, c) => acc + c.restaPorPagar, 0);
    const totalMontoVencido = filteredRecords.reduce((acc, c) => acc + c.mora.montoVencido, 0);
    const totalCuotasVencidas = filteredRecords.reduce((acc, c) => acc + c.mora.cuotasVencidas, 0);
    const porcentajeGlobalAmortizado = totalValorTerrenos > 0 ? (totalPagadoAcumulado / totalValorTerrenos) * 100 : 0;

    return {
      totalContratos,
      totalValorTerrenos,
      totalPagadoAcumulado,
      totalRestaPorPagar,
      totalMontoVencido,
      totalCuotasVencidas,
      porcentajeGlobalAmortizado
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  // Preset report categories
  const presets: { id: ReportMode; title: string; subtitle: string; badge?: string }[] = [
    { id: 'ALL', title: 'Todos los Clientes', subtitle: 'Cartera global completa' },
    { id: 'AL_DIA', title: 'Solo Clientes Al Día', subtitle: '0 cuotas vencidas (al corriente)', badge: 'Al Día' },
    { id: 'MORA_1', title: 'Al menos 1 cuota vencida', subtitle: 'Mora general (≥ 1 cuota)', badge: '1+ Cuota' },
    { id: 'MORA_2', title: '2 o más cuotas vencidas', subtitle: 'Atraso moderado (≥ 2 cuotas)' },
    { id: 'MORA_3', title: '3 o más cuotas vencidas', subtitle: 'Mora exigible (Recomendado)', badge: 'Recomendado' },
    { id: 'MORA_4', title: '4 o más cuotas vencidas', subtitle: 'Mora grave / Riesgo legal', badge: 'Crítico' },
    { id: 'CUSTOM', title: 'Personalizado', subtitle: 'Elegir cantidad exacta o mínima' }
  ];

  // Export to authentic Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('No hay clientes en el reporte', {
        description: 'Ajuste los filtros para incluir contratos en la exportación.'
      });
      return;
    }

    setIsExporting(true);
    try {
      // Build structured rows including lot value, paid amount, remaining balance, and overdue breakdown
      const excelRows = filteredRecords.map((c, index) => ({
        'N°': index + 1,
        'Código Contrato': c.codigo_contrato,
        'DNI Titular': c.dni,
        'Cliente / Propietario': c.propietario,
        'Teléfono': c.telefono || 'Sin teléfono',
        'Correo Electrónico': c.correo || 'Sin correo',
        'Dirección': c.direccion || 'Sin dirección',
        'Distrito': c.distrito || '',
        'Provincia': c.provincia || '',
        'Departamento': c.departamento || '',
        'Etapa': c.etapa || 1,
        'Manzana': c.manzana,
        'Lote': c.numero_lote,
        'Valor del Terreno (S/)': Number(c.valorTerreno.toFixed(2)),
        'Monto Inicial Pagado (S/)': Number(c.inicial.toFixed(2)),
        'Cuota Mensual (S/)': Number(c.montoCuota.toFixed(2)),
        'Cuotas Pagadas': c.cuotasPagadas,
        'Total Cuotas del Terreno': c.totalCuotas,
        'Cuotas Restantes': c.cuotasRestantes,
        'Total Pagado a la Fecha (S/)': Number(c.totalPagado.toFixed(2)),
        'Cuánto le Resta por Pagar (S/)': Number(c.restaPorPagar.toFixed(2)),
        '% Pagado del Terreno': `${c.porcentajePagado.toFixed(1)}%`,
        '% Restante del Terreno': `${c.porcentajeRestante.toFixed(1)}%`,
        'Estado del Cliente': c.mora.cuotasVencidas === 0 
          ? 'AL DÍA' 
          : c.mora.cuotasVencidas === 1 
            ? '1 CUOTA VENCIDA' 
            : `${c.mora.cuotasVencidas} CUOTAS VENCIDAS (EN MORA)`,
        'Cuotas Vencidas': c.mora.cuotasVencidas,
        'Detalle Cuotas Vencidas': c.mora.numerosCuotas.length > 0 
          ? `Cuotas: ${c.mora.numerosCuotas.join(', ')}` 
          : 'Ninguna (Al día)',
        'Monto Vencido Exigible (S/)': Number(c.mora.montoVencido.toFixed(2)),
        'Días de Atraso': c.mora.diasAtraso,
        'Vencida Desde': c.mora.vencidaDesde || '',
        'Asesor de Venta': c.asesor || 'Sin asesor'
      }));

      // Create sheet and workbook
      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Auto-fit column widths
      const colWidths = Object.keys(excelRows[0] || {}).map((key) => {
        const headerLen = key.length;
        const maxValLen = Math.max(
          ...excelRows.map((row) => (row[key as keyof typeof row] ? String(row[key as keyof typeof row]).length : 0))
        );
        return { wch: Math.min(Math.max(headerLen, maxValLen) + 3, 40) };
      });
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      const sheetTitle = reportMode === 'AL_DIA' 
        ? 'Clientes Al Dia' 
        : reportMode === 'ALL'
          ? 'Cartera Completa'
          : `Clientes Mora ${reportMode}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));

      // Filename
      const dateStr = new Date().toISOString().split('T')[0];
      const modeName = reportMode === 'AL_DIA' 
        ? 'Al_Dia' 
        : reportMode === 'ALL'
          ? 'Cartera_Completa'
          : reportMode === 'CUSTOM'
            ? `${customMinCuotas}_cuotas`
            : reportMode.toLowerCase();
      const fileName = `Reporte_Cobranzas_${modeName}_ECOSOL_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      toast.success('Reporte Excel generado con éxito', {
        description: `Se exportaron ${filteredRecords.length} clientes con su saldo restante y cuotas pagadas.`
      });
    } catch (err: any) {
      console.error('Error generating Excel report:', err);
      toast.error('Error al exportar a Excel', {
        description: err?.message || 'No se pudo generar el archivo .xlsx.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('No hay clientes para exportar');
      return;
    }

    const headers = [
      'N°',
      'Código Contrato',
      'DNI',
      'Propietario',
      'Teléfono',
      'Correo',
      'Dirección',
      'Distrito',
      'Provincia',
      'Etapa',
      'Manzana',
      'Lote',
      'Valor del Terreno (S/)',
      'Monto Inicial (S/)',
      'Cuota Mensual (S/)',
      'Cuotas Pagadas',
      'Total Cuotas',
      'Cuotas Restantes',
      'Total Pagado (S/)',
      'Resta por Pagar (S/)',
      '% Pagado',
      'Estado',
      'Cuotas Vencidas',
      'Detalle Cuotas Vencidas',
      'Monto Vencido (S/)',
      'Días Atraso',
      'Asesor'
    ];

    const rows = filteredRecords.map((c, i) => [
      i + 1,
      `"${c.codigo_contrato}"`,
      `"${c.dni}"`,
      `"${c.propietario}"`,
      `"${c.telefono || ''}"`,
      `"${c.correo || ''}"`,
      `"${c.direccion || ''}"`,
      `"${c.distrito || ''}"`,
      `"${c.provincia || ''}"`,
      c.etapa || 1,
      `"${c.manzana}"`,
      `"${c.numero_lote}"`,
      c.valorTerreno.toFixed(2),
      c.inicial.toFixed(2),
      c.montoCuota.toFixed(2),
      c.cuotasPagadas,
      c.totalCuotas,
      c.cuotasRestantes,
      c.totalPagado.toFixed(2),
      c.restaPorPagar.toFixed(2),
      `"${c.porcentajePagado.toFixed(1)}%"`,
      `"${c.mora.cuotasVencidas === 0 ? 'AL DÍA' : `${c.mora.cuotasVencidas} CUOTAS VENCIDAS`}"`,
      c.mora.cuotasVencidas,
      `"${c.mora.numerosCuotas.join(' - ') || 'Ninguna'}"`,
      c.mora.montoVencido.toFixed(2),
      c.mora.diasAtraso,
      `"${c.asesor || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Reporte_Cobranzas_${reportMode}_ECOSOL_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Archivo CSV descargado correctamente');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-100 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Reporte de Cobranzas, Cuotas y Saldos de Terrenos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  Exportación Excel (.xlsx)
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Genera reportes de clientes al día, con 1 o más cuotas vencidas, cuotas pagadas y saldo pendiente en base al valor del lote
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Main Filter Section: Report Modes (Al día, 1+ cuota, 2+, 3+, 4+, Todos) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Criterio de Estado y Cuotas del Reporte
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Selecciona la situación de cartera que deseas generar
              </span>
            </div>

            {/* Presets Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {presets.map((preset) => {
                const isSelected = reportMode === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setReportMode(preset.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-bold line-clamp-1 ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {preset.title}
                      </span>
                      {preset.badge && (
                        <span className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                          preset.badge === 'Al Día' 
                            ? 'bg-blue-100 text-blue-800' 
                            : preset.badge === 'Crítico' 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                      {preset.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Mode controls (when CUSTOM selected) */}
            {reportMode === 'CUSTOM' && (
              <div className="p-3 bg-white rounded-lg border border-emerald-200 flex flex-wrap items-center gap-3 animate-in fade-in duration-150">
                <span className="text-[11px] font-semibold text-emerald-900">Configuración personalizada de cuotas vencidas:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOperator('gte')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      operator === 'gte' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Mínimo (≥)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperator('exact')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      operator === 'exact' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Exactamente (=)
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCustomMinCuotas(prev => Math.max(0, prev - 1))}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={customMinCuotas}
                    onChange={(e) => setCustomMinCuotas(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-14 h-7 text-center bg-white border border-slate-300 rounded font-bold text-slate-900 text-xs focus:outline-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomMinCuotas(prev => prev + 1)}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-slate-500 ml-1">cuotas vencidas</span>
                </div>
              </div>
            )}

            {/* Secondary Segment Filters Bar */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-slate-600 font-medium block text-[11px] mb-1">
                  Filtrar por Etapa:
                </label>
                <select
                  value={selectedEtapa}
                  onChange={(e) => setSelectedEtapa(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todas las Etapas</option>
                  {uniqueEtapas.map((et) => (
                    <option key={et} value={String(et)}>Etapa {et}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block text-[11px] mb-1">
                  Filtrar por Manzana:
                </label>
                <select
                  value={selectedManzana}
                  onChange={(e) => setSelectedManzana(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="ALL">Todas las Manzanas ({uniqueManzanas.length})</option>
                  {uniqueManzanas.map((mz) => (
                    <option key={mz} value={mz}>Manzana {mz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium block text-[11px] mb-1">
                  Ordenar por:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="CUOTAS_VENCIDAS_DESC">Mayor N° Cuotas Vencidas</option>
                  <option value="RESTANTE_DESC">Mayor Saldo Restante (Cuánto le resta)</option>
                  <option value="VALOR_DESC">Mayor Valor de Terreno (S/)</option>
                  <option value="PAGADAS_DESC">Más Cuotas Pagadas</option>
                  <option value="NOMBRE_ASC">Nombre del Cliente (A - Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time Financial Impact KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider">Clientes Filtrados</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900">{stats.totalContratos}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">contratos en el reporte</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider">Valor Terrenos</span>
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">
                S/ {stats.totalValorTerrenos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">precio de venta total</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider">Total Pagado</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-emerald-700 truncate">
                S/ {stats.totalPagadoAcumulado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                {stats.porcentajeGlobalAmortizado.toFixed(1)}% amortizado
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider">Resta por Pagar</span>
                <Wallet className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-blue-700 truncate">
                S/ {stats.totalRestaPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">saldo de cartera pendiente</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider">Monto Vencido</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-sm font-bold text-rose-600 truncate">
                S/ {stats.totalMontoVencido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-rose-700 font-medium mt-0.5">
                {stats.totalCuotasVencidas} cuotas vencidas
              </p>
            </div>
          </div>

          {/* Quick Search and Preview Table */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">
                  Vista Previa del Reporte ({filteredRecords.length} clientes listos para exportar)
                </span>
                <span className="text-[11px] text-slate-400">• Incluye cuotas pagadas y saldo restante en base al valor del lote</span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por DNI, cliente o lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5">Contrato &amp; Lote</th>
                    <th className="px-3 py-2.5">Cliente / Titular</th>
                    <th className="px-3 py-2.5">Dirección &amp; Contacto</th>
                    <th className="px-3 py-2.5 text-right">Valor del Terreno</th>
                    <th className="px-3 py-2.5 text-center">Avance Cuotas</th>
                    <th className="px-3 py-2.5 text-right">Resta por Pagar</th>
                    <th className="px-3 py-2.5 text-center">Situación / Mora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 space-y-1">
                        <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="font-semibold text-slate-600">
                          No se encontraron contratos con el criterio seleccionado.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Prueba seleccionando otro estado (por ejemplo, "Todos los Clientes" o "Al Día").
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((c) => {
                      const isAlDia = c.mora.cuotasVencidas === 0;
                      return (
                        <tr key={c.codigo_contrato} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 text-xs block">
                              {c.codigo_contrato}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium">
                              Mz {c.manzana} Lt {c.numero_lote} • Etapa {c.etapa || 1}
                            </span>
                          </td>

                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-slate-900 block">{c.propietario}</span>
                            <span className="text-[10px] text-slate-500 font-mono">DNI: {c.dni}</span>
                          </td>

                          <td className="px-3 py-2.5 max-w-48 text-[11px]">
                            {c.telefono && (
                              <span className="text-slate-800 font-mono block">{c.telefono}</span>
                            )}
                            {c.direccion ? (
                              <span className="text-slate-600 truncate block text-[10px]" title={c.direccion}>
                                {c.direccion}{c.distrito ? `, ${c.distrito}` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Sin dirección</span>
                            )}
                          </td>

                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              S/ {c.valorTerreno.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-emerald-700 block">
                              Pagado: S/ {c.totalPagado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <span className="font-bold text-slate-900 block">
                              {c.cuotasPagadas} de {c.totalCuotas} cuotas
                            </span>
                            <div className="w-24 mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${Math.min(100, c.porcentajePagado)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Resta: {c.cuotasRestantes} cuotas ({c.porcentajeRestante.toFixed(0)}%)
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <span className="font-bold text-blue-700 text-xs block">
                              S/ {c.restaPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Cuota: S/ {c.montoCuota.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                          </td>

                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {isAlDia ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Al Día (0 vencidas)
                              </span>
                            ) : (
                              <div>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  c.mora.cuotasVencidas >= 4 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {c.mora.cuotasVencidas} {c.mora.cuotasVencidas === 1 ? 'cuota vencida' : 'cuotas vencidas'}
                                </span>
                                <span className="text-[10px] font-semibold text-rose-600 block mt-0.5">
                                  Debe S/ {c.mora.montoVencido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              {filteredRecords.length} de {enrichedCobranzas.length} contratos
            </span>
            <span>
              • Total Saldo Restante: <strong className="text-blue-700">S/ {stats.totalRestaPorPagar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0 || isExporting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:shadow-emerald-600/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? 'Generando Excel...' : 'Descargar Reporte en Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
