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
  AlertCircle
} from 'lucide-react';

type VentasTab = 'TODOS' | 'CREDITO' | 'CONTADO' | 'DESISTIDO';

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

  const [activeTab, setActiveTab] = useState<VentasTab>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Consulta directa a Supabase de la tabla 'contratos'
  const fetchContratos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Ejecutar consulta exacta solicitada
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
          clientes ( dni, nombres_apellidos, telefono ),
          lotes ( etapa, manzana, numero_lote, area_m2 )
        `)
        .order('id', { ascending: true });

      // Si Postgres detecta llaves foráneas múltiples (PGRST201), se desambigua con la sugerencia de PostgREST
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
            clientes!contratos_cliente_id_fkey ( dni, nombres_apellidos, telefono ),
            lotes!contratos_lote_id_fkey ( etapa, manzana, numero_lote, area_m2 )
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
        // Mapear directamente los datos reales de Supabase sin datos simulados
        const normalized: Contrato[] = data.map((row: any) => {
          const clienteObj = Array.isArray(row.clientes) ? row.clientes[0] : row.clientes;
          const loteObj = Array.isArray(row.lotes) ? row.lotes[0] : row.lotes;

          return {
            id: row.id,
            codigo_contrato: row.codigo_contrato,
            asesor: row.asesor || '',
            mes_contrato: row.mes_contrato || '',
            forma_compra: row.forma_compra,
            precio_venta: Number(row.precio_venta || 0),
            monto_inicial: Number(row.monto_inicial || 0),
            saldo_financiar: Number(row.saldo_financiar || 0),
            cantidad_cuotas: Number(row.cantidad_cuotas || 0),
            monto_cuota: Number(row.monto_cuota || 0),
            cuotas_pagadas_base: Number(row.cuotas_pagadas_base || 0),
            fecha_primer_pago: row.fecha_primer_pago || '',
            estado: row.estado,
            cliente: clienteObj,
            clientes: clienteObj,
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

  // Conteo por pestañas sobre datos reales
  const tabCounts = useMemo(() => {
    return {
      todos: contratos.length,
      credito: contratos.filter(c => c.forma_compra === 'CREDITO' && c.estado !== 'LIQUIDADO' && c.estado !== 'DESISTIDO').length,
      contado: contratos.filter(c => c.forma_compra === 'CONTADO' || c.estado === 'LIQUIDADO').length,
      desistido: contratos.filter(c => c.estado === 'DESISTIDO').length
    };
  }, [contratos]);

  // Filtrado de contratos reales
  const filteredContratos = useMemo(() => {
    return contratos.filter((c) => {
      // 1. Filtro por pestaña
      if (activeTab === 'CREDITO') {
        if (c.forma_compra !== 'CREDITO' || c.estado === 'LIQUIDADO' || c.estado === 'DESISTIDO') return false;
      } else if (activeTab === 'CONTADO') {
        if (c.forma_compra !== 'CONTADO' && c.estado !== 'LIQUIDADO') return false;
      } else if (activeTab === 'DESISTIDO') {
        if (c.estado !== 'DESISTIDO') return false;
      }

      // 2. Búsqueda
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

  // Paginación
  const totalPages = Math.ceil(filteredContratos.length / pageSize) || 1;
  const paginatedContratos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContratos.slice(start, start + pageSize);
  }, [filteredContratos, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header con botones de acción */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Gestión de Contratos &amp; Ventas
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {filteredContratos.length} expedientes
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Datos reales sincronizados directamente desde la tabla <code className="text-emerald-600 dark:text-emerald-400 font-mono">contratos</code> de Supabase
          </p>
        </div>

        {/* Action Buttons: Sincronizar, Nuevo Cliente & Registrar Venta */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchContratos}
            disabled={loading}
            title="Sincronizar directamente con Supabase"
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => setIsNuevoClienteModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>+ Nuevo Cliente</span>
          </button>

          <button
            onClick={() => setIsNuevaVentaModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>+ Registrar Venta</span>
          </button>
        </div>
      </div>

      {/* Banner de error si falla la consulta de Supabase */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-red-800 dark:text-red-200">
                Error al consultar la tabla contratos en Supabase
              </h3>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5 font-mono">
                {error}
              </p>
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

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        {/* Tabs Row */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setActiveTab('TODOS'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'TODOS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Todos</span>
            <span className="text-[10px] text-slate-400 font-mono">({tabCounts.todos})</span>
          </button>

          <button
            onClick={() => { setActiveTab('CREDITO'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CREDITO'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>A Crédito</span>
            <span className="text-[10px] text-slate-400 font-mono">({tabCounts.credito})</span>
          </button>

          <button
            onClick={() => { setActiveTab('CONTADO'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CONTADO'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Al Contado</span>
            <span className="text-[10px] text-slate-400 font-mono">({tabCounts.contado})</span>
          </button>

          <button
            onClick={() => { setActiveTab('DESISTIDO'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'DESISTIDO'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-white focus:bg-white border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-medium border-b border-slate-200 dark:border-slate-800 tracking-wider">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Cargando registros reales desde Supabase...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredContratos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
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
                    <tr key={ctr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Código Contrato */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 dark:text-white font-mono text-xs block">
                          {ctr.codigo_contrato}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {ctr.mes_contrato || 'Sin periodo'} • Asesor: {ctr.asesor || 'Sin asesor'}
                        </span>
                      </td>

                      {/* Titular / DNI */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs block truncate max-w-xs">
                          {clienteObj?.nombres_apellidos || 'Sin titular registrado'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {clienteObj?.dni ? `DNI ${clienteObj.dni}` : 'Sin DNI'}
                        </span>
                      </td>

                      {/* Lote Adquirido */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
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

                      {/* Modalidad (sin cuotas en la columna, como se solicitó) */}
                      <td className="px-4 py-3">
                        {isContado ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Al Contado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Crédito
                          </span>
                        )}
                      </td>

                      {/* Precio Venta */}
                      <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900 dark:text-white">
                        S/ {Number(ctr.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Saldo Deudor */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isContado ? (
                          <div>
                            <span className="font-medium text-emerald-700 dark:text-emerald-400 text-xs block">
                              S/ 0.00
                            </span>
                            <span className="text-[10px] text-slate-400">0 cuotas pend.</span>
                          </div>
                        ) : (
                          <div>
                            <span className={`font-semibold text-xs block ${isDesistido ? 'text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              S/ {Number(ctr.saldo_financiar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-400">Cuota: S/ {Number(ctr.monto_cuota).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isContado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Liquidado
                          </span>
                        ) : isDesistido ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Desistido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Activo
                          </span>
                        )}
                      </td>

                      {/* Detalle button */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedContractDetail(ctr)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
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
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span>Página <b>{currentPage}</b> de <b>{totalPages}</b></span>
            <span className="mx-2">•</span>
            <span>Total <b>{filteredContratos.length}</b> expedientes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
