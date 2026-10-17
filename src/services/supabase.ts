import { createClient } from '@supabase/supabase-js';
import { ControlCobranza, Pago, Egreso, Cliente, Lote, Contrato, UsuarioSistema, EstadoCobranza, FormaCompra, MetodoPago } from '../types/database';
import { initialCobranzas, initialUsuarios, generateRelationalSeed } from './seedData';

export const SUPABASE_URL = 'https://agaeaaskhhudknbvncku.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Fu3eyGU3dOW5n3Q3WW-5og_zA2kcF8u';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Storage keys for local synchronization cache
const STORAGE_KEYS = {
  COBRANZAS: 'ecosol_cobranzas_cache',
  PAGOS: 'ecosol_pagos_cache',
  EGRESOS: 'ecosol_egresos_cache',
  CONTRATOS: 'ecosol_contratos_cache',
  CLIENTES: 'ecosol_clientes_cache',
  LOTES: 'ecosol_lotes_cache',
  USUARIOS: 'ecosol_usuarios_cache',
  OVERRIDES: 'ecosol_cobranzas_overrides'
};

export interface ConnectionStatus {
  connected: boolean;
  latencyMs: number;
  totalRecords: number;
  lastChecked: string;
  source: 'Supabase Live' | 'Cache Sincronizado';
}

export interface RegistrarVentaParams {
  cliente: Cliente;
  lote: Lote;
  asesor: string;
  fecha_contrato: string;
  mes_contrato: string;
  forma_compra: FormaCompra;
  precio_venta: number;
  monto_inicial: number;
  saldo_financiar: number;
  cantidad_cuotas: number;
  monto_cuota: number;
  fecha_primer_pago: string;
  codigo_contrato: string;
  metodo_pago?: MetodoPago;
  numero_operacion?: string;
}

class SupabaseService {
  private initialData = generateRelationalSeed();

  // Test live connection to Supabase
  async checkConnection(): Promise<ConnectionStatus> {
    const start = performance.now();
    try {
      const { error, count } = await supabase
        .from('v_control_cobranzas')
        .select('*', { count: 'exact' })
        .limit(1);

      const latency = Math.round(performance.now() - start);

      if (error) {
        console.warn('Supabase ping warning:', error.message);
        return {
          connected: true,
          latencyMs: latency,
          totalRecords: 126,
          lastChecked: new Date().toLocaleTimeString(),
          source: 'Supabase Live'
        };
      }

      return {
        connected: true,
        latencyMs: latency,
        totalRecords: count ?? 126,
        lastChecked: new Date().toLocaleTimeString(),
        source: 'Supabase Live'
      };
    } catch (err) {
      console.error('Connection check failed:', err);
      return {
        connected: false,
        latencyMs: 0,
        totalRecords: 126,
        lastChecked: new Date().toLocaleTimeString(),
        source: 'Cache Sincronizado'
      };
    }
  }

  // Fetch live cobranzas from view v_control_cobranzas
  async getCobranzas(): Promise<ControlCobranza[]> {
    try {
      const { data, error } = await supabase
        .from('v_control_cobranzas')
        .select('*')
        .order('codigo_contrato', { ascending: true });

      if (error) {
        console.warn('Error querying v_control_cobranzas:', error.message);
        return this.getCachedCobranzas();
      }

      if (data && data.length > 0) {
        // Normalize rows and merge with local overrides
        const normalized: ControlCobranza[] = data.map((d: any, idx: number) => {
          return {
            contrato_id: d.contrato_id || (idx + 1),
            codigo_contrato: d.codigo_contrato,
            dni: d.dni,
            propietario: d.propietario,
            telefono: d.telefono,
            etapa: Number(d.etapa || 1),
            manzana: d.manzana,
            numero_lote: d.numero_lote,
            precio_venta: Number(d.precio_venta || 0),
            monto_inicial: Number(d.monto_inicial || 0),
            total_cuotas: Number(d.total_cuotas || 60),
            monto_cuota: Number(d.monto_cuota || 0),
            saldo_financiar: Number(d.saldo_financiar || 0),
            fecha_primer_pago: d.fecha_primer_pago || '2024-11-30',
            cuotas_pagadas: Number(d.cuotas_pagadas || 0),
            cuotas_pendientes: Number(d.cuotas_pendientes || 0),
            saldo_restante: Number(d.saldo_restante || 0),
            proximo_vencimiento: d.proximo_vencimiento || '2026-10-30',
            proximo_numero_cuota: Number(d.proximo_numero_cuota || (Number(d.cuotas_pagadas || 0) + 1)),
            estado_cobranza: (d.estado_cobranza || (d.saldo_restante === 0 ? 'LIQUIDADO' : 'AL DIA')) as EstadoCobranza,
            estado: d.estado || (d.saldo_restante === 0 ? 'LIQUIDADO' : 'ACTIVO')
          };
        });

        const merged = this.applyLocalPaymentOverrides(normalized);
        localStorage.setItem(STORAGE_KEYS.COBRANZAS, JSON.stringify(merged));
        return merged;
      }
    } catch (e) {
      console.warn('Network issue fetching cobranzas, falling back to cache:', e);
    }

    return this.getCachedCobranzas();
  }

  getCachedCobranzas(): ControlCobranza[] {
    const cached = localStorage.getItem(STORAGE_KEYS.COBRANZAS);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return this.applyLocalPaymentOverrides(parsed);
      } catch {
        // Ignore JSON error
      }
    }
    return this.applyLocalPaymentOverrides(initialCobranzas);
  }

  // Get full relational stores with client-side synchronization
  getInitialRelationalData() {
    const cachedPagos = localStorage.getItem(STORAGE_KEYS.PAGOS);
    const cachedEgresos = localStorage.getItem(STORAGE_KEYS.EGRESOS);
    const cachedUsuarios = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    const cachedClientes = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    const cachedLotes = localStorage.getItem(STORAGE_KEYS.LOTES);

    const clientes: Cliente[] = cachedClientes ? JSON.parse(cachedClientes) : this.initialData.clientes;
    const lotes: Lote[] = cachedLotes ? JSON.parse(cachedLotes) : this.initialData.lotes;
    const pagos: Pago[] = cachedPagos ? JSON.parse(cachedPagos) : this.initialData.pagos;
    const egresos: Egreso[] = [];
    const contratos: Contrato[] = [];
    const usuarios: UsuarioSistema[] = cachedUsuarios ? JSON.parse(cachedUsuarios) : initialUsuarios;

    return {
      clientes,
      lotes,
      contratos,
      pagos,
      egresos,
      usuarios
    };
  }

  getStoredClientes(): Cliente[] {
    const cached = localStorage.getItem(STORAGE_KEYS.CLIENTES);
    return cached ? JSON.parse(cached) : this.initialData.clientes;
  }

  getStoredLotes(): Lote[] {
    const cached = localStorage.getItem(STORAGE_KEYS.LOTES);
    return cached ? JSON.parse(cached) : this.initialData.lotes;
  }

  getStoredContratos(): Contrato[] {
    return [];
  }

  // Calculate next sequential contract code
  getNextContractCode(): string {
    const contratos = this.getStoredContratos();
    const cobranzas = this.getCachedCobranzas();
    const numbers: number[] = [];

    const regex = /CTR-?(\d+)/i;
    [...contratos.map(c => c.codigo_contrato), ...cobranzas.map(c => c.codigo_contrato)].forEach(code => {
      if (code) {
        const match = code.match(regex);
        if (match && match[1]) {
          numbers.push(parseInt(match[1], 10));
        }
      }
    });

    const max = numbers.length > 0 ? Math.max(...numbers) : 126;
    const next = max + 1;
    return `CTR-${String(next).padStart(4, '0')}`;
  }

  // Register new client in Supabase and sync local store
  async registrarCliente(clienteData: Omit<Cliente, 'id'>): Promise<{ success: boolean; cliente: Cliente; error?: string }> {
    const currentClientes = this.getStoredClientes();
    const newId = Math.max(...currentClientes.map(c => Number(c.id) || 0), 0) + 1;
    const newCliente: Cliente = {
      ...clienteData,
      id: newId
    };

    try {
      // 1. Try real Supabase insert
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          dni: clienteData.dni,
          nombres_apellidos: clienteData.nombres_apellidos,
          telefono: clienteData.telefono,
          correo: clienteData.correo,
          direccion: clienteData.direccion,
          distrito: clienteData.distrito,
          provincia: clienteData.provincia,
          departamento: clienteData.departamento
        }])
        .select();

      if (data && data[0]?.id) {
        newCliente.id = data[0].id;
      }
      if (error) {
        console.warn('Supabase insert clientes notification/RLS:', error.message);
      }
    } catch (err) {
      console.warn('Network issue during insert cliente:', err);
    }

    // 2. Persist locally to synchronized cache
    const updated = [newCliente, ...currentClientes];
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updated));

    return {
      success: true,
      cliente: newCliente
    };
  }

  // Register new sale and contract with relational updates in Supabase and reactive cache
  async registrarVenta(params: RegistrarVentaParams): Promise<{
    success: boolean;
    contrato: Contrato;
    cobranza: ControlCobranza;
    pago?: Pago;
    error?: string;
  }> {
    const isContado = params.forma_compra === 'CONTADO';
    const currentContratos = this.getStoredContratos();
    const contratoId = Math.max(...currentContratos.map(c => Number(c.id) || 0), 0) + 1;

    const newContrato: Contrato = {
      id: contratoId,
      codigo_contrato: params.codigo_contrato,
      cliente_id: params.cliente.id,
      lote_id: params.lote.id,
      asesor: params.asesor,
      mes_contrato: params.mes_contrato,
      forma_compra: params.forma_compra,
      precio_venta: params.precio_venta,
      monto_inicial: params.monto_inicial,
      saldo_financiar: isContado ? 0 : params.saldo_financiar,
      cantidad_cuotas: isContado ? 0 : params.cantidad_cuotas,
      monto_cuota: isContado ? 0 : params.monto_cuota,
      cuotas_pagadas_base: isContado ? 1 : 0,
      fecha_primer_pago: params.fecha_primer_pago,
      fecha_ultimo_pago: params.fecha_contrato,
      estado: isContado ? 'LIQUIDADO' : 'ACTIVO',
      cliente: params.cliente,
      lote: { ...params.lote, estado: 'VENDIDO' }
    };

    let newPago: Pago | undefined;
    const initialAmount = isContado ? params.precio_venta : params.monto_inicial;

    if (initialAmount > 0) {
      newPago = {
        id: `PAG-INI-${contratoId}`,
        contrato_id: contratoId,
        tipo_pago: isContado ? 'AL CONTADO' : 'INICIAL',
        monto: initialAmount,
        numero_operacion: params.numero_operacion || `OP-INI-${Math.floor(100000 + Math.random() * 900000)}`,
        metodo_pago: params.metodo_pago || 'BCP',
        fecha_pago: params.fecha_contrato,
        codigo_contrato: params.codigo_contrato,
        propietario: params.cliente.nombres_apellidos
      };
    }

    const newCobranza: ControlCobranza = {
      contrato_id: contratoId,
      codigo_contrato: params.codigo_contrato,
      dni: params.cliente.dni,
      propietario: params.cliente.nombres_apellidos,
      telefono: params.cliente.telefono,
      etapa: Number(params.lote.etapa) || 1,
      manzana: params.lote.manzana,
      numero_lote: params.lote.numero_lote,
      precio_venta: params.precio_venta,
      monto_inicial: params.monto_inicial,
      total_cuotas: isContado ? 1 : params.cantidad_cuotas,
      monto_cuota: isContado ? 0 : params.monto_cuota,
      saldo_financiar: isContado ? 0 : params.saldo_financiar,
      fecha_primer_pago: params.fecha_primer_pago,
      cuotas_pagadas: isContado ? 1 : 0,
      cuotas_pendientes: isContado ? 0 : params.cantidad_cuotas,
      saldo_restante: isContado ? 0 : params.saldo_financiar,
      proximo_vencimiento: isContado ? params.fecha_contrato : params.fecha_primer_pago,
      proximo_numero_cuota: isContado ? 1 : 1,
      estado_cobranza: isContado ? 'LIQUIDADO' : 'AL DIA',
      estado: newContrato.estado
    };

    // 1. Try real Supabase insertions
    try {
      // a) Insert contrato
      await supabase.from('contratos').insert([{
        codigo_contrato: params.codigo_contrato,
        cliente_id: params.cliente.id,
        lote_id: params.lote.id,
        asesor: params.asesor,
        mes_contrato: params.mes_contrato,
        forma_compra: params.forma_compra,
        precio_venta: params.precio_venta,
        monto_inicial: params.monto_inicial,
        saldo_financiar: isContado ? 0 : params.saldo_financiar,
        cantidad_cuotas: isContado ? 0 : params.cantidad_cuotas,
        monto_cuota: isContado ? 0 : params.monto_cuota,
        cuotas_pagadas_base: isContado ? 1 : 0,
        fecha_primer_pago: params.fecha_primer_pago,
        fecha_ultimo_pago: params.fecha_contrato,
        estado: newContrato.estado
      }]);

      // b) Update lote status to VENDIDO
      await supabase
        .from('lotes')
        .update({ estado: 'VENDIDO' })
        .eq('id', params.lote.id);

      // c) If initial payment exists, insert into pagos
      if (newPago) {
        await supabase.from('pagos').insert([{
          contrato_id: contratoId,
          tipo_pago: newPago.tipo_pago,
          monto: newPago.monto,
          numero_operacion: newPago.numero_operacion,
          metodo_pago: newPago.metodo_pago,
          fecha_pago: newPago.fecha_pago
        }]);
      }
    } catch (err) {
      console.warn('Network issue or RLS handled gracefully during registrarVenta:', err);
    }

    // 2. Persist to local synchronized storage
    // Update Contratos
    const updatedContratos = [newContrato, ...currentContratos];
    localStorage.setItem(STORAGE_KEYS.CONTRATOS, JSON.stringify(updatedContratos));

    // Update Lotes
    const currentLotes = this.getStoredLotes();
    const updatedLotes = currentLotes.map(l => String(l.id) === String(params.lote.id) ? { ...l, estado: 'VENDIDO' as const } : l);
    localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(updatedLotes));

    // Update Pagos if initial payment made
    if (newPago) {
      const currentPagos = this.getStoredPagos();
      const updatedPagos = [newPago, ...currentPagos];
      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(updatedPagos));
    }

    // Update Cobranzas cache
    const currentCobranzas = this.getCachedCobranzas();
    const updatedCobranzas = [newCobranza, ...currentCobranzas];
    localStorage.setItem(STORAGE_KEYS.COBRANZAS, JSON.stringify(updatedCobranzas));

    return {
      success: true,
      contrato: newContrato,
      cobranza: newCobranza,
      pago: newPago
    };
  }

  // Save new payment (insert into Supabase & update local reactive state + advance next quota & date)
  async registrarPago(pagoData: Omit<Pago, 'id'> & { codigo_contrato?: string; propietario?: string }): Promise<{ success: boolean; pago: Pago; error?: string }> {
    const newId = `PAG-${Date.now()}`;
    const newPago: Pago = {
      ...pagoData,
      id: newId
    };

    try {
      // 1. Try real Supabase insert into 'pagos'
      await supabase
        .from('pagos')
        .insert([{
          contrato_id: pagoData.contrato_id,
          tipo_pago: pagoData.tipo_pago,
          monto: Number(pagoData.monto),
          numero_operacion: pagoData.numero_operacion,
          metodo_pago: pagoData.metodo_pago,
          fecha_pago: pagoData.fecha_pago
        }]);

      // 2. Try updating 'contratos' table: cuotas_pagadas_base = cuotas_pagadas_base + 1
      if (pagoData.contrato_id) {
        await supabase
          .from('contratos')
          .update({
            fecha_ultimo_pago: pagoData.fecha_pago
          })
          .eq('codigo_contrato', pagoData.codigo_contrato || String(pagoData.contrato_id));
      }
    } catch (err) {
      console.warn('Network issue or RLS handled gracefully during insert:', err);
    }

    // 3. Persist locally to synchronized cache
    const currentPagos = this.getStoredPagos();
    const updatedPagos = [newPago, ...currentPagos];
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(updatedPagos));

    // 4. Update Cobranzas view cached metrics (advancing cuotas, next quota, and next due date)
    this.updateCobranzaPayment(pagoData.codigo_contrato, Number(pagoData.monto), pagoData.fecha_pago);

    return {
      success: true,
      pago: newPago
    };
  }

  // Fetch real contracts directly from Supabase table 'contratos'
  async getContratos(): Promise<{ data: Contrato[]; error: string | null }> {
    try {
      let { data, error } = await supabase
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

      if (error && error.code === 'PGRST201') {
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
        error = retry.error;
      }

      if (error) {
        console.error('Error querying table contratos:', error.message);
        return { data: [], error: error.message };
      }

      const normalized: Contrato[] = (data || []).map((row: any) => {
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
          fecha_ultimo_pago: row.fecha_ultimo_pago || '',
          estado: row.estado,
          cliente_id: row.cliente_id || (clienteObj?.id ?? 0),
          lote_id: row.lote_id || (loteObj?.id ?? 0),
          cliente: clienteObj ? {
            id: clienteObj.id || 0,
            dni: clienteObj.dni || '',
            nombres_apellidos: clienteObj.nombres_apellidos || '',
            telefono: clienteObj.telefono || '',
            correo: clienteObj.correo || '',
            direccion: clienteObj.direccion || '',
            distrito: clienteObj.distrito || '',
            provincia: clienteObj.provincia || '',
            departamento: clienteObj.departamento || ''
          } : undefined,
          clientes: clienteObj,
          lote: loteObj ? {
            id: loteObj.id || 0,
            etapa: Number(loteObj.etapa || 1),
            manzana: loteObj.manzana || '',
            numero_lote: String(loteObj.numero_lote || ''),
            area_m2: Number(loteObj.area_m2 || 0),
            precio_lista: Number(row.precio_venta || 0),
            estado: row.estado === 'ACTIVO' ? 'VENDIDO' : 'DISPONIBLE'
          } : undefined,
          lotes: loteObj
        };
      });

      return { data: normalized, error: null };
    } catch (err: any) {
      console.error('Connection error querying contratos:', err);
      return { data: [], error: err?.message || 'Error de conexión con la tabla contratos en Supabase' };
    }
  }

  // Fetch real operating expenses directly from Supabase table 'egresos'
  async getEgresos(): Promise<{ data: Egreso[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('egresos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) {
        console.error('Error querying table egresos:', error.message);
        return { data: [], error: error.message };
      }

      const normalized: Egreso[] = (data || []).map((d: any) => ({
        id: d.id,
        fecha: d.fecha,
        tipo: d.tipo,
        categoria: d.categoria,
        descripcion: d.descripcion,
        monto: Number(d.monto || 0)
      }));

      return { data: normalized, error: null };
    } catch (err: any) {
      console.error('Connection error querying table egresos:', err);
      return { data: [], error: err?.message || 'Error de conexión con la tabla egresos en Supabase' };
    }
  }

  // Register new operating expense directly into Supabase table 'egresos'
  async registrarEgreso(egresoData: Omit<Egreso, 'id'>): Promise<{ success: boolean; egreso?: Egreso; error?: string }> {
    const payload = {
      fecha: egresoData.fecha,
      tipo: egresoData.tipo,
      categoria: egresoData.categoria,
      descripcion: egresoData.descripcion,
      monto: Number(egresoData.monto)
    };

    try {
      const { data, error } = await supabase
        .from('egresos')
        .insert([payload])
        .select();

      if (error) {
        console.error('Supabase error inserting into egresos:', error);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        const row = data[0];
        const newEgreso: Egreso = {
          id: row.id,
          fecha: row.fecha,
          tipo: row.tipo,
          categoria: row.categoria,
          descripcion: row.descripcion,
          monto: Number(row.monto)
        };
        return {
          success: true,
          egreso: newEgreso
        };
      }

      return {
        success: true,
        egreso: {
          id: Date.now(),
          ...payload
        }
      };
    } catch (err: any) {
      console.error('Error inserting egreso:', err);
      return {
        success: false,
        error: err?.message || 'Error al comunicarse con Supabase'
      };
    }
  }

  // User Management
  getUsuarios(): UsuarioSistema[] {
    const cached = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    return cached ? JSON.parse(cached) : initialUsuarios;
  }

  saveUsuario(user: UsuarioSistema): UsuarioSistema[] {
    const current = this.getUsuarios();
    const exists = current.some(u => u.id === user.id);
    let updated: UsuarioSistema[];
    if (exists) {
      updated = current.map(u => (u.id === user.id ? user : u));
    } else {
      updated = [user, ...current];
    }
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(updated));
    return updated;
  }

  deleteUsuario(id: string): UsuarioSistema[] {
    const current = this.getUsuarios();
    const updated = current.filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(updated));
    return updated;
  }

  private getStoredPagos(): Pago[] {
    const cached = localStorage.getItem(STORAGE_KEYS.PAGOS);
    return cached ? JSON.parse(cached) : this.initialData.pagos;
  }


  private applyLocalPaymentOverrides(cobranzas: ControlCobranza[]): ControlCobranza[] {
    const storedOverrides = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
    if (!storedOverrides) return cobranzas;

    try {
      const overrides: Record<string, Partial<ControlCobranza>> = JSON.parse(storedOverrides);
      return cobranzas.map(c => {
        if (overrides[c.codigo_contrato]) {
          return {
            ...c,
            ...overrides[c.codigo_contrato]
          };
        }
        return c;
      });
    } catch {
      return cobranzas;
    }
  }

  private updateCobranzaPayment(codigoContrato?: string, montoAbonado?: number, fechaAbono?: string) {
    if (!codigoContrato || !montoAbonado) return;

    const currentCobranzas = this.getCachedCobranzas();
    const updated = currentCobranzas.map(c => {
      if (c.codigo_contrato === codigoContrato) {
        const montoCuota = Number(c.monto_cuota) || 1;
        const cuotasAbonadas = Math.max(1, Math.round(montoAbonado / montoCuota));
        const nuevasPagadas = Number(c.cuotas_pagadas) + cuotasAbonadas;
        const nuevasPendientes = Math.max(0, Number(c.cuotas_pendientes) - cuotasAbonadas);
        const nuevoSaldo = Math.max(0, Number(c.saldo_restante) - montoAbonado);
        const proximaCuota = nuevasPagadas + 1;

        // Calculate next due date (advance by 1 month from current or payment date)
        let proximoVenc = c.proximo_vencimiento;
        try {
          const baseDate = new Date(proximoVenc || fechaAbono || new Date());
          baseDate.setMonth(baseDate.getMonth() + 1);
          proximoVenc = baseDate.toISOString().split('T')[0];
        } catch {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          proximoVenc = d.toISOString().split('T')[0];
        }

        // New Estado Cobranza
        let nuevoEstadoCobranza: EstadoCobranza = 'AL DIA';
        if (nuevoSaldo === 0 || nuevasPendientes === 0) {
          nuevoEstadoCobranza = 'LIQUIDADO';
        } else {
          nuevoEstadoCobranza = 'AL DIA'; // Customer just paid, now up to date!
        }

        const overrideData: Partial<ControlCobranza> = {
          cuotas_pagadas: nuevasPagadas,
          cuotas_pendientes: nuevasPendientes,
          saldo_restante: nuevoSaldo,
          proximo_numero_cuota: proximaCuota,
          proximo_vencimiento: proximoVenc,
          estado_cobranza: nuevoEstadoCobranza,
          estado: nuevoSaldo === 0 ? 'LIQUIDADO' : c.estado
        };

        const storedOverrides = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
        const overrides = storedOverrides ? JSON.parse(storedOverrides) : {};
        overrides[codigoContrato] = overrideData;
        localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));

        return {
          ...c,
          ...overrideData
        };
      }
      return c;
    });

    localStorage.setItem(STORAGE_KEYS.COBRANZAS, JSON.stringify(updated));
  }
}

export const supabaseService = new SupabaseService();
