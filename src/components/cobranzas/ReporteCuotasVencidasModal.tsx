import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { ControlCobranza, Cliente, Contrato } from '../../types/database';
import { calcularMora, nivelMora, MoraInfo } from '../../utils/mora';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Filter, 
  AlertTriangle, 
  Users, 
  Wallet, 
  CheckCircle2, 
  Search, 
  ArrowUpDown, 
  Building2,
  Calendar,
  Mail,
  MapPin,
  Compass,
  Phone,
  SlidersHorizontal,
  ChevronRight
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
}

export const ReporteCuotasVencidasModal: React.FC<ReporteCuotasVencidasModalProps> = ({
  isOpen,
  onClose,
  initialMinCuotas = 3
}) => {
  const { cobranzas = [], clientes = [], contratos = [] } = useData();

  // Filter configuration
  const [minCuotas, setMinCuotas] = useState<number>(initialMinCuotas);
  const [operator, setOperator] = useState<'gte' | 'exact'>('gte');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('ALL');
  const [selectedManzana, setSelectedManzana] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'CUOTAS_DESC' | 'MONTO_DESC' | 'DIAS_DESC' | 'NOMBRE_ASC'>('CUOTAS_DESC');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Cross-reference cobranzas with clientes and contratos for complete contact and dossier data
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
        asesor: foundContract?.asesor || ''
      };
    });
  }, [cobranzas, clientes, contratos]);

  // Unique manzanas and etapas for filter select
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
        // Condition on overdue installments
        const cuotas = c.mora.cuotasVencidas;
        if (operator === 'gte') {
          if (cuotas < minCuotas) return false;
        } else {
          if (cuotas !== minCuotas) return false;
        }

        // Must not be liquidated or 0 overdue if minCuotas > 0
        if (minCuotas > 0 && cuotas <= 0) return false;

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
        if (sortBy === 'CUOTAS_DESC') {
          return b.mora.cuotasVencidas - a.mora.cuotasVencidas || b.mora.montoVencido - a.mora.montoVencido;
        }
        if (sortBy === 'MONTO_DESC') {
          return b.mora.montoVencido - a.mora.montoVencido;
        }
        if (sortBy === 'DIAS_DESC') {
          return b.mora.diasAtraso - a.mora.diasAtraso;
        }
        if (sortBy === 'NOMBRE_ASC') {
          return (a.propietario || '').localeCompare(b.propietario || '');
        }
        return 0;
      });
  }, [enrichedCobranzas, minCuotas, operator, selectedManzana, selectedEtapa, searchTerm, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalContratos = filteredRecords.length;
    const totalCuotasVencidas = filteredRecords.reduce((acc, c) => acc + c.mora.cuotasVencidas, 0);
    const montoTotalVencido = filteredRecords.reduce((acc, c) => acc + c.mora.montoVencido, 0);
    const saldoTotalRiesgo = filteredRecords.reduce((acc, c) => acc + Number(c.saldo_restante || 0), 0);
    const promedioDiasAtraso = totalContratos > 0 
      ? Math.round(filteredRecords.reduce((acc, c) => acc + c.mora.diasAtraso, 0) / totalContratos)
      : 0;

    return {
      totalContratos,
      totalCuotasVencidas,
      montoTotalVencido,
      saldoTotalRiesgo,
      promedioDiasAtraso
    };
  }, [filteredRecords]);

  if (!isOpen) return null;

  // Preset options for quick selection
  const presets = [
    { label: '1+ cuota', value: 1, desc: 'Toda la cartera en mora' },
    { label: '2+ cuotas', value: 2, desc: 'Atraso recurrente' },
    { label: '3+ cuotas', value: 3, desc: 'Recomendado para cobranza', highlight: true },
    { label: '4+ cuotas', value: 4, desc: 'Mora grave / Notificación' },
    { label: '6+ cuotas', value: 6, desc: 'Mora crítica / Legal' }
  ];

  // Export to authentic Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      toast.error('No hay clientes en el reporte', {
        description: 'Ajuste el número de cuotas vencidas o los filtros para incluir registros.'
      });
      return;
    }

    setIsExporting(true);
    try {
      // Build structured rows with full details including address, email, and overdue breakdown
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
        'Cuotas Vencidas': c.mora.cuotasVencidas,
        'Detalle Cuotas Impagas': c.mora.numerosCuotas.length > 0 
          ? `Cuotas: ${c.mora.numerosCuotas.join(', ')}` 
          : 'N/A',
        'Monto Vencido (S/)': Number(c.mora.montoVencido.toFixed(2)),
        'Días de Atraso': c.mora.diasAtraso,
        'Vencida Desde': c.mora.vencidaDesde || '',
        'Cuota Mensual (S/)': Number(Number(c.monto_cuota || 0).toFixed(2)),
        'Cuotas Pagadas': c.cuotas_pagadas,
        'Total Cuotas': c.total_cuotas,
        'Saldo Pendiente Total (S/)': Number(Number(c.saldo_restante || 0).toFixed(2)),
        'Severidad de Mora': c.mora.cuotasVencidas >= 4 ? 'CRÍTICA' : c.mora.cuotasVencidas >= 2 ? 'MODERADA' : 'LEVE',
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
      const sheetName = operator === 'gte' ? `Mora ${minCuotas}+ Cuotas` : `Mora ${minCuotas} Cuotas`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

      // Filename
      const dateStr = new Date().toISOString().split('T')[0];
      const conditionStr = operator === 'gte' ? `${minCuotas}_a_mas_cuotas` : `${minCuotas}_cuotas`;
      const fileName = `Reporte_Clientes_Mora_${conditionStr}_ECOSOL_${dateStr}.xlsx`;

      XLSX.writeFile(workbook, fileName);

      toast.success('Reporte Excel generado exitosamente', {
        description: `Se exportaron ${filteredRecords.length} clientes con un monto vencido de S/ ${stats.montoTotalVencido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}.`
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
      'Departamento',
      'Etapa',
      'Manzana',
      'Lote',
      'Cuotas Vencidas',
      'Detalle Cuotas',
      'Monto Vencido (S/)',
      'Días Atraso',
      'Vencida Desde',
      'Cuota Mensual (S/)',
      'Cuotas Pagadas',
      'Total Cuotas',
      'Saldo Pendiente (S/)',
      'Nivel Mora',
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
      `"${c.departamento || ''}"`,
      c.etapa || 1,
      `"${c.manzana}"`,
      `"${c.numero_lote}"`,
      c.mora.cuotasVencidas,
      `"${c.mora.numerosCuotas.join(' - ')}"`,
      c.mora.montoVencido.toFixed(2),
      c.mora.diasAtraso,
      `"${c.mora.vencidaDesde || ''}"`,
      Number(c.monto_cuota || 0).toFixed(2),
      c.cuotas_pagadas,
      c.total_cuotas,
      Number(c.saldo_restante || 0).toFixed(2),
      `"${c.mora.cuotasVencidas >= 4 ? 'CRÍTICA' : c.mora.cuotasVencidas >= 2 ? 'MODERADA' : 'LEVE'}"`,
      `"${c.asesor || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    const conditionStr = operator === 'gte' ? `${minCuotas}_a_mas_cuotas` : `${minCuotas}_cuotas`;
    link.setAttribute('download', `Reporte_Clientes_Mora_${conditionStr}_ECOSOL_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Archivo CSV descargado correctamente');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-emerald-100 shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Generador de Reportes de Clientes en Mora
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  Exportación Excel (.xlsx)
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Seleccione la cantidad de cuotas vencidas para filtrar y generar el reporte ejecutivo con datos de contacto completos
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Main Filter Section: Overdue Installments Selector */}
          <div className="p-4.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Criterio de Cuotas Vencidas
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-slate-600">
                <button
                  type="button"
                  onClick={() => setOperator('gte')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    operator === 'gte'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Mínimo ({minCuotas} o más cuotas)
                </button>
                <button
                  type="button"
                  onClick={() => setOperator('exact')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                    operator === 'exact'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Exactamente ({minCuotas} cuotas)
                </button>
              </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-500 block">
                Selección Rápida de Umbral de Mora:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {presets.map((preset) => {
                  const isSelected = minCuotas === preset.value && operator === 'gte';
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setMinCuotas(preset.value);
                        setOperator('gte');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                          {preset.label}
                        </span>
                        {preset.highlight && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Frecuente
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {preset.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Numeric Stepper + Additional Filters Bar */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-slate-600 font-medium block text-[11px] mb-1">
                  Cantidad personalizada:
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMinCuotas(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={minCuotas}
                    onChange={(e) => setMinCuotas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 h-8 text-center bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs focus:outline-emerald-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setMinCuotas(prev => prev + 1)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                  >
                    +
                  </button>
                  <span className="text-slate-500 text-[11px] ml-1">
                    {operator === 'gte' ? 'o más cuotas' : 'cuotas'}
                  </span>
                </div>
              </div>

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
                  <option value="ALL">Todas las Manzanas</option>
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
                  <option value="CUOTAS_DESC">Mayor N° de Cuotas Vencidas</option>
                  <option value="MONTO_DESC">Mayor Monto Vencido (S/)</option>
                  <option value="DIAS_DESC">Mayor Días de Atraso</option>
                  <option value="NOMBRE_ASC">Nombre del Cliente (A - Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Real-time KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Clientes Identificados</span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-bold text-slate-900">{stats.totalContratos}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                con {operator === 'gte' ? `${minCuotas} o más` : `${minCuotas}`} cuotas impagas
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Total Cuotas Vencidas</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-bold text-amber-700">{stats.totalCuotasVencidas}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">cuotas exigibles pendientes</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Monto Total Vencido</span>
                <Wallet className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-xl font-bold text-rose-600">
                S/ {stats.montoTotalVencido.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">deuda vencida por cobrar</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-medium uppercase tracking-wider">Promedio de Atraso</span>
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xl font-bold text-slate-900">{stats.promedioDiasAtraso} días</p>
              <p className="text-[10px] text-slate-400 mt-0.5">tiempo medio de mora</p>
            </div>
          </div>

          {/* Quick Search and Table Preview */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-xs">
                  Vista Previa del Reporte ({filteredRecords.length} registros listos para exportar)
                </span>
                <span className="text-[11px] text-slate-400">• Incluye Correo y Dirección completa</span>
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
                    <th className="px-3 py-2">Contrato</th>
                    <th className="px-3 py-2">Cliente / Titular</th>
                    <th className="px-3 py-2">Contacto & Correo</th>
                    <th className="px-3 py-2">Dirección</th>
                    <th className="px-3 py-2 text-center">Inmueble</th>
                    <th className="px-3 py-2 text-center">Cuotas Vencidas</th>
                    <th className="px-3 py-2 text-right">Monto Vencido</th>
                    <th className="px-3 py-2 text-center">Atraso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 space-y-1">
                        <AlertTriangle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <p className="font-semibold text-slate-600">
                          No se encontraron clientes con {operator === 'gte' ? `${minCuotas} o más` : `${minCuotas}`} cuotas vencidas.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Pruebe disminuyendo la cantidad requerida de cuotas o seleccionando otra etapa/manzana.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((c) => {
                      const sev = nivelMora(c.mora.cuotasVencidas);
                      return (
                        <tr key={c.codigo_contrato} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap font-mono font-bold text-slate-900 text-[11px]">
                            {c.codigo_contrato}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-900 block">{c.propietario}</span>
                            <span className="text-[10px] text-slate-400 font-mono">DNI: {c.dni}</span>
                          </td>
                          <td className="px-3 py-2 max-w-44">
                            <div className="space-y-0.5 text-[11px]">
                              {c.telefono ? (
                                <span className="text-slate-800 font-mono block">{c.telefono}</span>
                              ) : (
                                <span className="text-slate-400 italic block text-[10px]">Sin teléfono</span>
                              )}
                              {c.correo ? (
                                <span className="text-emerald-700 truncate block text-[10px]" title={c.correo}>
                                  {c.correo}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic block text-[10px]">Sin correo</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 max-w-48 text-[11px]">
                            {c.direccion ? (
                              <div className="space-y-0.5">
                                <span className="text-slate-800 font-medium truncate block" title={c.direccion}>
                                  {c.direccion}
                                </span>
                                {(c.distrito || c.provincia) && (
                                  <span className="text-[10px] text-slate-400 block">
                                    {[c.distrito, c.provincia].filter(Boolean).join(' • ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Sin dirección</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span className="font-medium text-slate-900">
                              Mz {c.manzana} Lt {c.numero_lote}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Etapa {c.etapa || 1}</span>
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                sev === 'grave'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : sev === 'moderada'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                              }`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {c.mora.cuotasVencidas} {c.mora.cuotasVencidas === 1 ? 'cuota' : 'cuotas'}
                            </span>
                            {c.mora.numerosCuotas.length > 0 && (
                              <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                                Cuota {c.mora.numerosCuotas.slice(0, 3).join(', ')}{c.mora.numerosCuotas.length > 3 ? '...' : ''}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap font-bold text-rose-600">
                            S/ {c.mora.montoVencido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {c.mora.diasAtraso} d
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
            <span>cumplen el criterio de {operator === 'gte' ? `${minCuotas}+ cuotas vencidas` : `${minCuotas} cuotas exactas`}</span>
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
