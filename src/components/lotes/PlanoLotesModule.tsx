import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Lote, Contrato } from '../../types/database';
import { 
  Building2, 
  Search, 
  X, 
  User, 
  CreditCard, 
  FileText,
  Mail,
  MapPin,
  Compass
} from 'lucide-react';

export const PlanoLotesModule: React.FC = () => {
  const { lotes, contratos, cobranzas, clientes, setSelectedContractDetail, setSelectedContractForPayment } = useData();

  const [selectedMz, setSelectedMz] = useState<string>('ALL');
  const [selectedEstado, setSelectedEstado] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer state for selected lot
  const [drawerLote, setDrawerLote] = useState<Lote | null>(null);

  // Group unique manzanas
  const uniqueManzanas = useMemo(() => {
    const set = new Set<string>();
    lotes.forEach(l => {
      if (l.manzana) set.add(l.manzana.toUpperCase().trim());
    });
    return Array.from(set).sort();
  }, [lotes]);

  // Overall lot stats
  const lotStats = useMemo(() => {
    return {
      total: lotes.length,
      disponibles: lotes.filter(l => l.estado === 'DISPONIBLE').length,
      vendidos: lotes.filter(l => l.estado === 'VENDIDO').length,
      desistidos: lotes.filter(l => l.estado === 'DESISTIDO').length
    };
  }, [lotes]);

  // Filtered lots
  const filteredLotes = useMemo(() => {
    return lotes.filter((l) => {
      if (selectedMz !== 'ALL' && l.manzana.toUpperCase().trim() !== selectedMz) return false;
      if (selectedEstado !== 'ALL' && l.estado !== selectedEstado) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchMz = `mz ${l.manzana}`.toLowerCase().includes(q) || l.manzana.toLowerCase().includes(q);
        const matchLt = `lt ${l.numero_lote}`.toLowerCase().includes(q) || l.numero_lote.includes(q);
        if (!matchMz && !matchLt) return false;
      }
      return true;
    });
  }, [lotes, selectedMz, selectedEstado, searchTerm]);

  // Group lots by Manzana for display
  const lotsByManzana = useMemo(() => {
    const map = new Map<string, Lote[]>();
    filteredLotes.forEach((l) => {
      const mz = l.manzana.toUpperCase().trim();
      if (!map.has(mz)) map.set(mz, []);
      map.get(mz)!.push(l);
    });

    // Sort lots numerically within each manzana
    map.forEach((list) => {
      list.sort((a, b) => parseInt(a.numero_lote, 10) - parseInt(b.numero_lote, 10));
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredLotes]);

  // Find contract associated with a lot
  const getContractForLote = (lote: Lote): Contrato | undefined => {
    return contratos.find(
      c => c.lote_id === lote.id || 
      (c.lote?.manzana.toUpperCase().trim() === lote.manzana.toUpperCase().trim() && 
       String(c.lote?.numero_lote) === String(lote.numero_lote))
    );
  };

  // Find cobranza data for a lot
  const getCobranzaForLote = (lote: Lote) => {
    return cobranzas.find(
      c => c.manzana?.toUpperCase().trim() === lote.manzana.toUpperCase().trim() && 
      String(c.numero_lote) === String(lote.numero_lote)
    );
  };

  const handleLotClick = (lote: Lote) => {
    setDrawerLote(lote);
  };

  const drawerContract = drawerLote ? getContractForLote(drawerLote) : undefined;
  const drawerCobranza = drawerLote ? getCobranzaForLote(drawerLote) : undefined;

  const drawerCliente = useMemo(() => {
    if (!drawerContract && !drawerCobranza) return undefined;
    const cl = drawerContract?.cliente || (drawerContract as any)?.clientes;
    const dni = cl?.dni || drawerCobranza?.dni;
    const nombre = (cl?.nombres_apellidos || drawerCobranza?.propietario || '').trim().toLowerCase();
    const clId = drawerContract?.cliente_id;

    const found = (clientes || []).find(c =>
      (clId && c.id === clId) ||
      (dni && c.dni === dni) ||
      (nombre && c.nombres_apellidos?.trim().toLowerCase() === nombre)
    );

    return found || cl;
  }, [drawerContract, drawerCobranza, clientes]);

  return (
    <div className="space-y-4 relative">
      {/* Header & Stats Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Plano de Lotes
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {lotes.length} lotes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visualización de disponibilidad urbanística organizada por manzanas
          </p>
        </div>

        {/* Status Legend & Count Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Disponibles: {lotStats.disponibles}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Vendidos: {lotStats.vendidos}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-medium text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Desistidos: {lotStats.desistidos}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Manzana o Lote..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        {/* Manzana select */}
        <div>
          <select
            value={selectedMz}
            onChange={(e) => setSelectedMz(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todas las Manzanas ({uniqueManzanas.length})</option>
            {uniqueManzanas.map((mz) => (
              <option key={mz} value={mz}>Manzana {mz}</option>
            ))}
          </select>
        </div>

        {/* Estado select */}
        <div>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="VENDIDO">Vendidos</option>
            <option value="DESISTIDO">Desistidos</option>
          </select>
        </div>
      </div>

      {/* Lot Grid Grouped by Manzana */}
      <div className="space-y-4">
        {lotsByManzana.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">No se encontraron lotes con los filtros seleccionados</p>
          </div>
        ) : (
          lotsByManzana.map(([manzana, lots]) => (
            <div key={manzana} className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              {/* Manzana Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                    {manzana}
                  </span>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">
                      Manzana {manzana}
                    </h2>
                    <span className="text-[11px] text-slate-400">
                      {lots.length} lotes • {lots.filter(l => l.estado === 'DISPONIBLE').length} disponibles
                    </span>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Clic en un lote para ver detalles
                </span>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {lots.map((lote) => {
                  const isDisponible = lote.estado === 'DISPONIBLE';
                  const isVendido = lote.estado === 'VENDIDO';

                  return (
                    <div
                      key={lote.id}
                      onClick={() => handleLotClick(lote)}
                      className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer select-none ${
                        isDisponible
                          ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50'
                          : isVendido
                            ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            : 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                      }`}
                    >
                      {/* Top state indicator badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-900">
                          Lt. {lote.numero_lote}
                        </span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isDisponible
                              ? 'bg-emerald-500'
                              : isVendido
                                ? 'bg-slate-400'
                                : 'bg-rose-500'
                          }`}
                        />
                      </div>

                      {/* Area */}
                      <p className="text-[11px] text-slate-500">
                        {lote.area_m2} m²
                      </p>

                      {/* Price / Status */}
                      <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                        <span
                          className={`font-medium ${
                            isDisponible
                              ? 'text-emerald-700'
                              : isVendido
                                ? 'text-slate-600'
                                : 'text-rose-700'
                          }`}
                        >
                          {isDisponible ? 'Disponible' : isVendido ? 'Vendido' : 'Desistido'}
                        </span>

                        <span className="font-mono text-slate-500">
                          S/{Math.round(lote.precio_lista / 1000)}k
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lateral Drawer for Selected Lot */}
      {drawerLote && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setDrawerLote(null)} 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Lateral Slide-in Drawer */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-sm bg-white border-l border-slate-200 p-5 flex flex-col justify-between shadow-xl">
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Mz {drawerLote.manzana} - Lt {drawerLote.numero_lote}
                      </h2>
                      <span className="text-[11px] text-slate-500">Etapa {drawerLote.etapa} • Ecosol</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawerLote(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Callout */}
                <div className="my-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Estado</span>
                    <span
                      className={`text-xs font-semibold block mt-0.5 ${
                        drawerLote.estado === 'DISPONIBLE'
                          ? 'text-emerald-700'
                          : drawerLote.estado === 'VENDIDO'
                            ? 'text-slate-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {drawerLote.estado}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Precio de Lista</span>
                    <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                      S/ {Number(drawerLote.precio_lista).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Lot Specifics */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Área</span>
                    <span className="text-slate-900 font-medium text-xs">{drawerLote.area_m2} m²</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Zonificación</span>
                    <span className="text-slate-900 font-medium text-xs">Residencial R-2</span>
                  </div>
                </div>

                {/* If Sold or Contracted: Buyer info dossier */}
                {drawerLote.estado !== 'DISPONIBLE' && (drawerContract || drawerCobranza) ? (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-xs">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Titular Adquiriente</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Propietario</span>
                      <span className="text-slate-900 font-semibold text-xs block">
                        {drawerCliente?.nombres_apellidos || drawerCobranza?.propietario}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 block text-[11px]">DNI</span>
                        <span className="text-slate-800 font-medium font-mono">
                          {drawerCliente?.dni || drawerCobranza?.dni || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">Teléfono</span>
                        <span className="text-slate-800 font-medium">
                          {drawerCliente?.telefono || drawerCobranza?.telefono || '-'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] mb-0.5">Correo Electrónico</span>
                      {drawerCliente?.correo ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <a href={`mailto:${drawerCliente.correo}`} className="text-emerald-700 hover:underline font-medium truncate block text-xs">
                            {drawerCliente.correo}
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin correo registrado</span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px] mb-0.5">Dirección y Ubicación</span>
                      {drawerCliente?.direccion || drawerCliente?.distrito ? (
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div className="text-slate-800 text-xs">
                            <span className="font-medium block">{drawerCliente.direccion || 'Sin dirección exacta'}</span>
                            {(drawerCliente.distrito || drawerCliente.provincia || drawerCliente.departamento) && (
                              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Compass className="w-3 h-3 text-slate-400 shrink-0" />
                                {[drawerCliente.distrito, drawerCliente.provincia, drawerCliente.departamento].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Sin dirección registrada</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Contrato</span>
                      <span className="text-slate-900 font-mono font-medium text-xs block">
                        {drawerContract?.codigo_contrato || drawerCobranza?.codigo_contrato}
                      </span>
                    </div>

                    {drawerCobranza && (
                      <div className="p-2.5 rounded-md bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Cuotas Pagadas</span>
                          <span className="text-slate-800 font-medium">
                            {drawerCobranza.cuotas_pagadas} / {drawerCobranza.total_cuotas}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Saldo Restante</span>
                          <span className="text-slate-900 font-medium">
                            S/ {Number(drawerCobranza.saldo_restante).toLocaleString('es-PE')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : drawerLote.estado === 'DISPONIBLE' ? (
                  <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                    <span className="font-semibold block text-emerald-900">Lote Disponible</span>
                    <p className="text-[11px] text-emerald-700">
                      Terreno disponible para venta inmediata con saneamiento e inscripción en Sunarp.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-slate-200 space-y-2">
                {drawerContract && (
                  <button
                    onClick={() => {
                      setSelectedContractDetail(drawerContract);
                      setDrawerLote(null);
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Expediente de Contrato</span>
                  </button>
                )}

                {drawerCobranza && (
                  <button
                    onClick={() => {
                      setSelectedContractForPayment(drawerCobranza);
                      setDrawerLote(null);
                    }}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Registrar Pago</span>
                  </button>
                )}

                <button
                  onClick={() => setDrawerLote(null)}
                  className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer text-center"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
