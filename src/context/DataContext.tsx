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
  egresos: Egreso[];
  loadingEgresos: boolean;
  egresosError: string | null;
  refreshEgresos: () => Promise<void>;
  usuarios: UsuarioSistema[];
  connectionStatus: ConnectionStatus;
  loading: boolean;
  metrics: KPIMetrics;
  registrarAbono: (pagoData: Omit<Pago, 'id'> & { codigo_contrato?: string; propietario?: string }) => Promise<boolean>;
  registrarEgreso: (egresoData: Omit<Egreso, 'id'>) => Promise<{ success: boolean; error?: string }>;
  registrarCliente: (clienteData: Omit<Cliente, 'id'>) => Promise<Cliente | null>;
  registrarVenta: (params: RegistrarVentaParams) => Promise<boolean>;
  getNextContractCode: () => string;
  guardarUsuario: (usuario: UsuarioSistema) => void;
  eliminarUsuario: (id: string) => void;
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
      setContratos(res.data);
      setContratosError(null);
    }
    setLoadingContratos(false);
  }, []);

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

    // 1. Check live connection status
    const status = await supabaseService.checkConnection();
    setConnectionStatus(status);

    // 2. Fetch live cobranzas from view v_control_cobranzas
    const cobranzasList = await supabaseService.getCobranzas();
    setCobranzas(cobranzasList);

    // 3. Load relational base data (clientes, lotes, pagos, usuarios)
    const relational = supabaseService.getInitialRelationalData();
    setClientes(relational.clientes);
    setLotes(relational.lotes);
    setPagos(relational.pagos);
    setUsuarios(relational.usuarios);

    // 4. Load real egresos and real contratos directly from Supabase
    await Promise.all([
      fetchEgresos(),
      fetchContratos()
    ]);

    setLoading(false);
  }, [fetchEgresos, fetchContratos]);

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

  const registrarVenta = async (params: RegistrarVentaParams): Promise<boolean> => {
    const res = await supabaseService.registrarVenta(params);
    if (res.success) {
      // 1. Prepend contract
      setContratos(prev => [res.contrato, ...prev]);

      // 2. Update lot status to VENDIDO
      setLotes(prev => prev.map(l => String(l.id) === String(params.lote.id) ? { ...l, estado: 'VENDIDO' as const } : l));

      // 3. Prepend payment if initial amount paid
      if (res.pago) {
        setPagos(prev => [res.pago!, ...prev]);
      }

      // 4. Prepend collection record
      setCobranzas(prev => [res.cobranza, ...prev]);

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

      return true;
    }
    return false;
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

  const guardarUsuario = (user: UsuarioSistema) => {
    const updated = supabaseService.saveUsuario(user);
    setUsuarios(updated);
  };

  const eliminarUsuario = (id: string) => {
    const updated = supabaseService.deleteUsuario(id);
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
        egresos,
        loadingEgresos,
        egresosError,
        refreshEgresos: fetchEgresos,
        usuarios,
        connectionStatus,
        loading,
        metrics,
        registrarAbono,
        registrarEgreso,
        registrarCliente,
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
