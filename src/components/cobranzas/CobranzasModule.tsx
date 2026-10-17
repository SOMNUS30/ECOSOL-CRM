import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ControlCobranza } from '../../types/database';
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
  UserPlus
} from 'lucide-react';

export const CobranzasModule: React.FC = () => {
  const { cobranzas, setSelectedContractForPayment, loading, setIsNuevoClienteModalOpen } = useData();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManzana, setSelectedManzana] = useState<string>('ALL');
  const [selectedEtapa, setSelectedEtapa] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');

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
  const filteredCobranzas = useMemo(() => {
    return cobranzas.filter((c) => {
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

      return true;
    });
  }, [cobranzas, searchTerm, selectedManzana, selectedEtapa, selectedEstado]);

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
    const msg = `Estimado(a) ${c.propietario}, le saludamos de ECOSOL INMOBILIARIA. Le recordamos que su Cuota #${c.proximo_numero_cuota || (c.cuotas_pagadas + 1)} por un monto de S/ ${c.monto_cuota} (Lote Mz ${c.manzana} Lt ${c.numero_lote}, Contrato ${c.codigo_contrato}) vence el ${formatDueDate(c.proximo_vencimiento)}. Puede abonar vía BCP, Yape o Interbank. Agradecemos su puntualidad.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNuevoClienteModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Nuevo Cliente</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 shadow-xs">
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
            <option value="ALL">Todas las Manzanas ({uniqueManzanas.length})</option>
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
      </div>

      {/* Cobranzas Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Contrato &amp; Lote</th>
                <th className="px-4 py-3">Propietario / Contacto</th>
                <th className="px-4 py-3 w-44">Avance de Cuotas</th>
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
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-36"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded w-16 mx-auto"></div></td>
                    <td className="px-4 py-3.5"><div className="h-6 bg-slate-100 rounded w-20 mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedCobranzas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
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
    </div>
  );
};
