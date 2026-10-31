import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ControlCobranza, Cliente, Lote, Contrato, Pago, Egreso, UsuarioSistema, EstadoCobranza } from '../types/database';
import { supabaseService, ConnectionStatus, RegistrarVentaParams } from '../services/supabase';

interface KPIMetrics {
  recaudacionTotal: number;
  carteraCobrarActiva: number;
  lotesVendidos: number;
  totalLotes: number;
  flujoCajaNeto: number;
  totalEgresos: number;
}

interface DataContextType {
  cobranzas: ControlCobranza[];
  clientes: Cliente[];
  lotes: Lote[];
  contratos: Contrato[];
  loadingContratos: boolean;
  contratosError: string | null;
  refreshContratos: () => Promise<void>;
  setContratos: React.Dispatch<React.SetStateAction<Contrato[]>>;
  pagos: Pago[];
  loadingPagos: boolean;
  refreshPagos: () => Promise<void>;
  egresos: Egreso[];
  loadingEgresos: boolean;
  egresosError: string | null;
  refreshEgresos: () => Promise<void>;
  usuarios: UsuarioSistema[];
  connectionStatus: ConnectionStatus;
  loading: boolean;
  metrics: KPIMetrics;
  registrarAbono: (pagoData: Omit<Pago, 'id'> & { codigo_contrato?: string; propietario?: string }) => Promise<boolean>;
  eliminarPago: (pagoId: number | string) => Promise<{ success: boolean; error?: string }>;
  registrarEgreso: (egresoData: Omit<Egreso, 'id'>) => Promise<{ success: boolean; error?: string }>;
  registrarCliente: (clienteData: Omit<Cliente, 'id'>) => Promise<Cliente | null>;
  actualizarCliente: (id: number | string, updates: Partial<Cliente>) => Promise<{ success: boolean; error?: string }>;
  actualizarLote: (id: number | string, updates: Partial<Lote>) => Promise<{ success: boolean; lote?: Lote; error?: string }>;
  actualizarLotesMasivo: (updatesList: Array<Partial<Lote> & { id: number | string }>) => Promise<{ success: boolean; count: number; error?: string }>;
  registrarVenta: (params: RegistrarVentaParams) => Promise<boolean>;
  getNextContractCode: () => string;
  guardarUsuario: (usuario: UsuarioSistema) => Promise<void> | void;
  eliminarUsuario: (id: string) => Promise<void> | void;
  refreshData: () => Promise<void>;
  selectedContractForPayment: ControlCobranza | null;
  setSelectedContractForPayment: (c: ControlCobranza | null) => void;
  selectedContractDetail: Contrato | null;
  setSelectedContractDetail: (c: Contrato | null) => void;
  activeVoucher: Pago | null;
  setActiveVoucher: (p: Pago | null) => void;
  isNuevoClienteModalOpen: boolean;
  setIsNuevoClienteModalOpen: (open: boolean) => void;
  isNuevaVentaModalOpen: boolean;
  setIsNuevaVentaModalOpen: (open: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cobranzas, setCobranzas] = useState<ControlCobranza[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loadingContratos, setLoadingContratos] = useState<boolean>(true);
  const [contratosError, setContratosError] = useState<string | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loadingPagos, setLoadingPagos] = useState<boolean>(true);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [loadingEgresos, setLoadingEgresos] = useState<boolean>(true);
  const [egresosError, setEgresosError] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    latencyMs: 0,
    totalRecords: 0,
    lastChecked: '',
    source: 'Cache Sincronizado'
  });

  // Modal control states
  const [selectedContractForPayment, setSelectedContractForPayment] = useState<ControlCobranza | null>(null);
  const [selectedContractDetail, setSelectedContractDetail] = useState<Contrato | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<Pago | null>(null);
  const [isNuevoClienteModalOpen, setIsNuevoClienteModalOpen] = useState<boolean>(false);
  const [isNuevaVentaModalOpen, setIsNuevaVentaModalOpen] = useState<boolean>(false);

  const fetchContratos = useCallback(async () => {
    setLoadingContratos(true);
    setContratosError(null);
    const res = await supabaseService.getContratos();
    if (res.error) {
      setContratosError(res.error);
      setContratos([]);
    } else {
      const rawContratos = res.data || [];
      const clientMap = new Map<string, Cliente>();
      clientes.forEach(c => {
        if (c.id) clientMap.set(String(c.id), c);
        if (c.dni) clientMap.set(String(c.dni).trim(), c);
        if (c.nombres_apellidos) clientMap.set(c.nombres_apellidos.trim().toLowerCase(), c);
      });

      const loadedContratos = rawContratos.map(ctr => {
        const cId = ctr.cliente_id || ctr.cliente?.id || (ctr as any).clientes?.id;
        const cDni = ctr.cliente?.dni || (ctr as any).clientes?.dni;
        const cName = (ctr.cliente?.nombres_apellidos || (ctr as any).clientes?.nombres_apellidos || '').trim().toLowerCase();

        const matched = (cId && clientMap.get(String(cId))) ||
                        (cDni && clientMap.get(String(cDni))) ||
                        (cName && clientMap.get(cName));

        if (matched) {
          const mergedCliente: Cliente = {
            ...matched,
            ...(ctr.cliente || (ctr as any).clientes || {}),
            correo: (ctr.cliente?.correo || (ctr as any).clientes?.correo || matched.correo || '').trim(),
            direccion: (ctr.cliente?.direccion || (ctr as any).clientes?.direccion || matched.direccion || '').trim(),
            distrito: (ctr.cliente?.distrito || (ctr as any).clientes?.distrito || matched.distrito || '').trim(),
            provincia: (ctr.cliente?.provincia || (ctr as any).clientes?.provincia || matched.provincia || '').trim(),
            departamento: (ctr.cliente?.departamento || (ctr as any).clientes?.departamento || matched.departamento || '').trim(),
            telefono: (ctr.cliente?.telefono || (ctr as any).clientes?.telefono || matched.telefono || '').trim(),
            dni: (ctr.cliente?.dni || (ctr as any).clientes?.dni || matched.dni || '').trim()
          };
          return {
            ...ctr,
            cliente: mergedCliente,
            clientes: mergedCliente
          };
        }
        return ctr;
      });

      setContratos(loadedContratos);
      setContratosError(null);
    }
    setLoadingContratos(false);
    return;
  }, [clientes]);

  const fetchPagos = useCallback(async (currentContratos?: Contrato[]) => {
    setLoadingPagos(true);
    const res = await supabaseService.getPagos(currentContratos || contratos, cobranzas);
    if (res.data) {
      setPagos(res.data);
    }
    setLoadingPagos(false);
  }, [contratos, cobranzas]);

  const fetchEgresos = useCallback(async () => {
    setLoadingEgresos(true);
    setEgresosError(null);
    const res = await supabaseService.getEgresos();
    if (res.error) {
      setEgresosError(res.error);
      setEgresos([]);
    } else {
      setEgresos(res.data);
      setEgresosError(null);
    }
    setLoadingEgresos(false);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Clean old mock cache if it had small placeholder datasets & clear stale overrides
    try {
      localStorage.removeItem('ecosol_cobranzas_overrides');
      const cachedPagos = localStorage.getItem('ecosol_pagos_cache');
      if (cachedPagos) {
        const parsed = JSON.parse(cachedPagos);
        if (Array.isArray(parsed) && parsed.length < 50) {
          localStorage.removeItem('ecosol_pagos_cache');
        }
      }
    } catch {
      // ignore
    }

    // 1. Check live connection status
    const status = await supabaseService.checkConnection();
    setConnectionStatus(status);

    // 2. Fetch live data from Supabase in parallel
    const [cobranzasList, contratosRes, clientesRes, lotesRes, egresosRes] = await Promise.all([
      supabaseService.getCobranzas(),
      supabaseService.getContratos(),
      supabaseService.getClientes(),
      supabaseService.getLotes(),
      supabaseService.getEgresos()
    ]);

    setCobranzas(cobranzasList);

    const rawContratos = contratosRes.data || [];
    const clientList = clientesRes.data || [];

    // Map clients to ensure 100% of contracts have full client info (correo, direccion, distrito, etc.)
    const clientMap = new Map<string, Cliente>();
    clientList.forEach(c => {
      if (c.id) clientMap.set(String(c.id), c);
      if (c.dni) clientMap.set(String(c.dni).trim(), c);
      if (c.nombres_apellidos) clientMap.set(c.nombres_apellidos.trim().toLowerCase(), c);
    });

    const loadedContratos = rawContratos.map(ctr => {
      const cId = ctr.cliente_id || ctr.cliente?.id || (ctr as any).clientes?.id;
      const cDni = ctr.cliente?.dni || (ctr as any).clientes?.dni;
      const cName = (ctr.cliente?.nombres_apellidos || (ctr as any).clientes?.nombres_apellidos || '').trim().toLowerCase();

      const matched = (cId && clientMap.get(String(cId))) ||
                      (cDni && clientMap.get(String(cDni))) ||
                      (cName && clientMap.get(cName));

      if (matched) {
        const mergedCliente: Cliente = {
          ...matched,
          ...(ctr.cliente || (ctr as any).clientes || {}),
          correo: (ctr.cliente?.correo || (ctr as any).clientes?.correo || matched.correo || '').trim(),
          direccion: (ctr.cliente?.direccion || (ctr as any).clientes?.direccion || matched.direccion || '').trim(),
          distrito: (ctr.cliente?.distrito || (ctr as any).clientes?.distrito || matched.distrito || '').trim(),
          provincia: (ctr.cliente?.provincia || (ctr as any).clientes?.provincia || matched.provincia || '').trim(),
          departamento: (ctr.cliente?.departamento || (ctr as any).clientes?.departamento || matched.departamento || '').trim(),
          telefono: (ctr.cliente?.telefono || (ctr as any).clientes?.telefono || matched.telefono || '').trim(),
          dni: (ctr.cliente?.dni || (ctr as any).clientes?.dni || matched.dni || '').trim()
        };
        return {
          ...ctr,
          cliente: mergedCliente,
          clientes: mergedCliente
        };
      }
      return ctr;
    });

    setContratos(loadedContratos);
    if (contratosRes.error) setContratosError(contratosRes.error);

    if (clientList.length > 0) {
      setClientes(clientList);
    }
    if (lotesRes.data && lotesRes.data.length > 0) {
      setLotes(lotesRes.data);
    }
    if (egresosRes.data) {
      setEgresos(egresosRes.data);
    }
    if (egresosRes.error) setEgresosError(egresosRes.error);

    // 3. Fetch real payments from Supabase table 'pagos' (710 records) enriched with real contracts & collections
    const pagosRes = await supabaseService.getPagos(loadedContratos, cobranzasList);
    if (pagosRes.data) {
      setPagos(pagosRes.data);
    }

    // 4. Load usuarios from Supabase / cache
    const loadedUsuarios = await supabaseService.getUsuarios();
    setUsuarios(loadedUsuarios);

    setLoading(false);
    setLoadingContratos(false);
    setLoadingEgresos(false);
    setLoadingPagos(false);
  }, []);

  useEffect(() => {
    loadData();

    // Periodic ping to keep connection status alive
    const interval = setInterval(async () => {
      const status = await supabaseService.checkConnection();
      setConnectionStatus(status);
    }, 45000);

    return () => clearInterval(interval);
  }, [loadData]);

  const registrarCliente = async (clienteData: Omit<Cliente, 'id'>): Promise<Cliente | null> => {
    const res = await supabaseService.registrarCliente(clienteData);
    if (res.success) {
      setClientes(prev => [res.cliente, ...prev]);
      return res.cliente;
    }
    return null;
  };

  const actualizarCliente = async (id: number | string, updates: Partial<Cliente>): Promise<{ success: boolean; error?: string }> => {
    const res = await supabaseService.actualizarCliente(id, updates);
    if (res.success) {
      setClientes(prev => prev.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c));
      setContratos(prev => prev.map(ctr => {
        const cId = ctr.cliente_id || ctr.cliente?.id || (ctr as any).clientes?.id;
        if (String(cId) === String(id)) {
          const updatedCli = { ...ctr.cliente, ...updates } as Cliente;
          return {
            ...ctr,
            cliente: updatedCli,
            clientes: updatedCli
          };
        }
        return ctr;
      }));
    }
    return res;
  };

  const actualizarLote = async (id: number | string, updates: Partial<Lote>): Promise<{ success: boolean; lote?: Lote; error?: string }> => {
    const res = await supabaseService.actualizarLote(id, updates);
    if (res.success) {
      setLotes(prev => prev.map(l => String(l.id) === String(id) ? { ...l, ...updates } : l));
      setContratos(prev => prev.map(ctr => {
        if (String(ctr.lote_id) === String(id) || String(ctr.lote?.id) === String(id)) {
          const updatedLote = { ...ctr.lote, ...updates } as Lote;
          return {
            ...ctr,
            lote: updatedLote,
            lotes: updatedLote
          };
        }
        return ctr;
      }));
    }
    return res;
  };

  const actualizarLotesMasivo = async (updatesList: Array<Partial<Lote> & { id: number | string }>): Promise<{ success: boolean; count: number; error?: string }> => {
    const res = await supabaseService.actualizarLotesMasivo(updatesList);
    if (res.success) {
      const updateMap = new Map<string, Partial<Lote>>();
      updatesList.forEach(u => updateMap.set(String(u.id), u));

      setLotes(prev => prev.map(l => {
        const up = updateMap.get(String(l.id));
        return up ? { ...l, ...up } : l;
      }));

      setContratos(prev => prev.map(ctr => {
        const up = updateMap.get(String(ctr.lote_id)) || (ctr.lote?.id && updateMap.get(String(ctr.lote.id)));
        if (up) {
          const updatedLote = { ...ctr.lote, ...up } as Lote;
          return {
            ...ctr,
            lote: updatedLote,
            lotes: updatedLote
          };
        }
        return ctr;
      }));
    }
    return res;
  };

  const registrarVenta = async (params: RegistrarVentaParams): Promise<boolean> => {
    const res = await supabaseService.registrarVenta(params);
    if (res.success) {
      // 1. Prepend contract to state immediately
      setContratos(prev => [res.contrato, ...prev]);

      // 2. Update lot status to VENDIDO in state immediately
      setLotes(prev => prev.map(l => String(l.id) === String(params.lote.id) ? { ...l, estado: 'VENDIDO' as const } : l));

      // 3. Prepend payment if initial amount paid
      if (res.pago) {
        setPagos(prev => [res.pago!, ...prev]);
      }

      // 4. Prepend collection record to state immediately
      setCobranzas(prev => [res.cobranza, ...prev]);

      // 5. Background re-fetch from Supabase to keep all tables and PostgreSQL views 100% synchronized
      try {
        await Promise.all([
          fetchContratos(),
          fetchPagos(),
          supabaseService.getCobranzas().then(cob => setCobranzas(cob))
        ]);
      } catch (e) {
        console.warn('Background sync error after sale:', e);
      }

      return true;
    }
    return false;
  };

  const getNextContractCode = (): string => {
    return supabaseService.getNextContractCode();
  };

  const registrarAbono = async (pagoData: Omit<Pago, 'id'> & { codigo_contrato?: string; propietario?: string }): Promise<boolean> => {
    const res = await supabaseService.registrarPago(pagoData);
    if (res.success) {
      // Prepend payment to state
      setPagos(prev => [res.pago, ...prev]);

      // Update cobranzas record in memory with immediate next quota & date advance
      if (pagoData.codigo_contrato) {
        setCobranzas(prev => prev.map(c => {
          if (c.codigo_contrato === pagoData.codigo_contrato) {
            const montoCuota = Number(c.monto_cuota) || 1;
            const cuotasAbonadas = Math.max(1, Math.round(Number(pagoData.monto) / montoCuota));
            const pagadas = Number(c.cuotas_pagadas) + cuotasAbonadas;
            const pendientes = Math.max(0, Number(c.cuotas_pendientes) - cuotasAbonadas);
            const saldo = Math.max(0, Number(c.saldo_restante) - Number(pagoData.monto));
            const proximaCuotaNum = pagadas + 1;

            // Advance due date by 1 month
            let nextDue = c.proximo_vencimiento;
            try {
              const base = new Date(c.proximo_vencimiento || pagoData.fecha_pago);
              base.setMonth(base.getMonth() + 1);
              nextDue = base.toISOString().split('T')[0];
            } catch {
              const d = new Date();
              d.setDate(d.getDate() + 30);
              nextDue = d.toISOString().split('T')[0];
            }

            const nuevoEstadoCobranza: EstadoCobranza = saldo === 0 ? 'LIQUIDADO' : 'AL DIA';

            return {
              ...c,
              cuotas_pagadas: pagadas,
              cuotas_pendientes: pendientes,
              saldo_restante: saldo,
              proximo_numero_cuota: proximaCuotaNum,
              proximo_vencimiento: nextDue,
              estado_cobranza: nuevoEstadoCobranza,
              estado: saldo === 0 ? 'LIQUIDADO' : c.estado
            };
          }
          return c;
        }));

        // Update corresponding contract in memory (cuotas_pagadas_base = cuotas_pagadas_base + 1)
        setContratos(prev => prev.map(ctr => {
          if (ctr.codigo_contrato === pagoData.codigo_contrato) {
            const nuevasPagadas = Number(ctr.cuotas_pagadas_base || 0) + 1;
            return {
              ...ctr,
              cuotas_pagadas_base: nuevasPagadas,
              fecha_ultimo_pago: pagoData.fecha_pago,
              saldo_financiar: Math.max(0, ctr.saldo_financiar - Number(pagoData.monto))
            };
          }
          return ctr;
        }));
      }

      // Re-fetch in background to keep Supabase state 100% synchronized
      try {
        await fetchPagos();
        await fetchContratos();
      } catch (err) {
        console.warn('Background sync error:', err);
      }

      return true;
    }
    return false;
  };

  const eliminarPago = async (pagoId: number | string): Promise<{ success: boolean; error?: string }> => {
    // 1. Identify target pago BEFORE deleting to obtain amount and contract reference
    const targetPago = pagos.find(p => String(p.id) === String(pagoId));

    const res = await supabaseService.eliminarPago(pagoId);
    if (res.success) {
      // 2. Immediately remove from pagos state
      setPagos(prev => prev.filter(p => String(p.id) !== String(pagoId)));

      // 3. Immediately revert in cobranzas state (instant reactive UI update)
      if (targetPago) {
        setCobranzas(prev => prev.map(c => {
          const isMatch = 
            (targetPago.codigo_contrato && c.codigo_contrato === targetPago.codigo_contrato) ||
            (targetPago.contrato_id && String(c.contrato_id) === String(targetPago.contrato_id));

          if (isMatch) {
            const montoCuota = Number(c.monto_cuota) || 1;
            const cuotasARestar = Math.max(1, Math.round(Number(targetPago.monto) / montoCuota));
            const nuevasPagadas = Math.max(0, Number(c.cuotas_pagadas) - cuotasARestar);
            const nuevasPendientes = Math.min(Number(c.total_cuotas || 60), Number(c.cuotas_pendientes) + cuotasARestar);
            const nuevoSaldo = Number(c.saldo_restante) + Number(targetPago.monto);
            const proximaCuotaNum = nuevasPagadas + 1;
            const nuevoEstadoCobranza: EstadoCobranza = nuevoSaldo === 0 ? 'LIQUIDADO' : 'AL DIA';

            return {
              ...c,
              cuotas_pagadas: nuevasPagadas,
              cuotas_pendientes: nuevasPendientes,
              saldo_restante: nuevoSaldo,
              proximo_numero_cuota: proximaCuotaNum,
              estado_cobranza: nuevoEstadoCobranza,
              estado: nuevoSaldo === 0 ? 'LIQUIDADO' : 'ACTIVO'
            };
          }
          return c;
        }));

        // 4. Immediately revert in contratos state (instant reactive UI update)
        setContratos(prev => prev.map(ctr => {
          const isMatch = 
            (targetPago.codigo_contrato && ctr.codigo_contrato === targetPago.codigo_contrato) ||
            (targetPago.contrato_id && String(ctr.id) === String(targetPago.contrato_id));

          if (isMatch) {
            const montoCuota = Number(ctr.monto_cuota) || 1;
            const cuotasARestar = Math.max(1, Math.round(Number(targetPago.monto) / montoCuota));
            const nuevasPagadas = Math.max(0, Number(ctr.cuotas_pagadas_base || 0) - cuotasARestar);
            const nuevoSaldo = Number(ctr.saldo_financiar || 0) + Number(targetPago.monto);
            return {
              ...ctr,
              cuotas_pagadas_base: nuevasPagadas,
              saldo_financiar: nuevoSaldo,
              estado: nuevoSaldo === 0 ? 'LIQUIDADO' : 'ACTIVO'
            };
          }
          return ctr;
        }));
      }

      // 5. Re-fetch in background to keep all tables (contracts, cobranzas, pagos) 100% synchronized with Supabase
      try {
        await fetchPagos();
        await fetchContratos();
        const cobList = await supabaseService.getCobranzas();
        setCobranzas(cobList);
      } catch (err) {
        console.warn('Background sync error after deleting pago:', err);
      }
      return { success: true };
    }
    return { success: false, error: res.error || 'No se pudo eliminar el pago' };
  };

  const registrarEgreso = async (egresoData: Omit<Egreso, 'id'>): Promise<{ success: boolean; error?: string }> => {
    const res = await supabaseService.registrarEgreso(egresoData);
    if (res.success && res.egreso) {
      setEgresos(prev => [res.egreso!, ...prev]);
      setEgresosError(null);
      // Re-fetch to ensure complete sync with database
      fetchEgresos();
      return { success: true };
    }
    return { success: false, error: res.error || 'No se pudo guardar el gasto en Supabase.' };
  };

  const guardarUsuario = async (user: UsuarioSistema) => {
    const updated = await supabaseService.saveUsuario(user);
    setUsuarios(updated);
  };

  const eliminarUsuario = async (id: string) => {
    const updated = await supabaseService.deleteUsuario(id);
    setUsuarios(updated);
  };

  // Memoized KPI metrics
  const metrics: KPIMetrics = useMemo(() => {
    // 1. Recaudación Total Ingresos: Sum of all payments registered
    const recaudacionTotal = pagos.reduce((sum, p) => sum + Number(p.monto || 0), 0);

    // 2. Cartera por Cobrar: Sum of saldo_restante of the cobranzas view
    const carteraCobrarActiva = cobranzas
      .filter(c => c.estado !== 'DESISTIDO' && c.estado_cobranza !== 'LIQUIDADO')
      .reduce((sum, c) => sum + Number(c.saldo_restante || 0), 0);

    // 3. Lotes Vendidos: Count of sold lots vs Total lots
    const lotesVendidos = lotes.filter(l => l.estado === 'VENDIDO').length;
    const totalLotes = lotes.length;

    // 4. Total Egresos
    const totalEgresos = egresos.reduce((sum, e) => sum + Number(e.monto || 0), 0);

    // 5. Balance de Caja: Total Ingresos menos Total Egresos
    const flujoCajaNeto = recaudacionTotal - totalEgresos;

    return {
      recaudacionTotal,
      carteraCobrarActiva,
      lotesVendidos,
      totalLotes,
      flujoCajaNeto,
      totalEgresos
    };
  }, [pagos, cobranzas, lotes, egresos]);

  return (
    <DataContext.Provider
      value={{
        cobranzas,
        clientes,
        lotes,
        contratos,
        loadingContratos,
        contratosError,
        refreshContratos: fetchContratos,
        setContratos,
        pagos,
        loadingPagos,
        refreshPagos: fetchPagos,
        egresos,
        loadingEgresos,
        egresosError,
        refreshEgresos: fetchEgresos,
        usuarios,
        connectionStatus,
        loading,
        metrics,
        registrarAbono,
        eliminarPago,
        registrarEgreso,
        registrarCliente,
        actualizarCliente,
        actualizarLote,
        actualizarLotesMasivo,
        registrarVenta,
        getNextContractCode,
        guardarUsuario,
        eliminarUsuario,
        refreshData: loadData,
        selectedContractForPayment,
        setSelectedContractForPayment,
        selectedContractDetail,
        setSelectedContractDetail,
        activeVoucher,
        setActiveVoucher,
        isNuevoClienteModalOpen,
        setIsNuevoClienteModalOpen,
        isNuevaVentaModalOpen,
        setIsNuevaVentaModalOpen
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
