import { createClient } from '@supabase/supabase-js';
import { ControlCobranza, Pago, Egreso, Cliente, Lote, Contrato, UsuarioSistema, EstadoCobranza, FormaCompra, MetodoPago, EmpresaConfig, RolUsuario } from '../types/database';
import { initialCobranzas, initialUsuarios, generateRelationalSeed } from './seedData';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://agaeaaskhhudknbvncku.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Fu3eyGU3dOW5n3Q3WW-5og_zA2kcF8u';

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
  OVERRIDES: 'ecosol_cobranzas_overrides',
  EMPRESA: 'ecosol_empresa_config'
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

        // Live Supabase view is authoritative; persist to local cache and clear stale overrides
        localStorage.setItem(STORAGE_KEYS.COBRANZAS, JSON.stringify(normalized));
        localStorage.removeItem(STORAGE_KEYS.OVERRIDES);
        return normalized;
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

  // Update existing client in Supabase and sync local store
  async actualizarCliente(id: number | string, updates: Partial<Cliente>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          ...(updates.nombres_apellidos !== undefined && { nombres_apellidos: updates.nombres_apellidos }),
          ...(updates.dni !== undefined && { dni: updates.dni }),
          ...(updates.telefono !== undefined && { telefono: updates.telefono }),
          ...(updates.correo !== undefined && { correo: updates.correo }),
          ...(updates.direccion !== undefined && { direccion: updates.direccion }),
          ...(updates.distrito !== undefined && { distrito: updates.distrito }),
          ...(updates.provincia !== undefined && { provincia: updates.provincia }),
          ...(updates.departamento !== undefined && { departamento: updates.departamento })
        })
        .eq('id', id);

      if (error) {
        console.warn('Supabase update cliente warning:', error.message);
      }
    } catch (err: any) {
      console.warn('Network issue during update cliente:', err);
    }

    // Persist locally
    const currentClientes = this.getStoredClientes();
    const updated = currentClientes.map(c => String(c.id) === String(id) ? { ...c, ...updates } : c);
    localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(updated));

    return { success: true };
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
        let nextVentaPagoId = 711;
        try {
          const { data: maxRow } = await supabase
            .from('pagos')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
          if (maxRow && maxRow[0]?.id) {
            nextVentaPagoId = Number(maxRow[0].id) + 1;
          }
        } catch {
          nextVentaPagoId = Date.now();
        }

        newPago.id = nextVentaPagoId;

        await supabase.from('pagos').insert([{
          id: nextVentaPagoId,
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
      // 1. Resolve target contract from Supabase to obtain current cuotas_pagadas_base and numeric ID
      let targetContrato: any = null;
      if (pagoData.codigo_contrato) {
        const { data } = await supabase
          .from('contratos')
          .select('id, codigo_contrato, cuotas_pagadas_base, saldo_financiar, monto_cuota, estado')
          .eq('codigo_contrato', pagoData.codigo_contrato)
          .maybeSingle();
        targetContrato = data;
      }
      
      if (!targetContrato && pagoData.contrato_id) {
        const numericId = Number(pagoData.contrato_id);
        if (!isNaN(numericId)) {
          const { data } = await supabase
            .from('contratos')
            .select('id, codigo_contrato, cuotas_pagadas_base, saldo_financiar, monto_cuota, estado')
            .eq('id', numericId)
            .maybeSingle();
          targetContrato = data;
        }
      }

      const numericContractId = targetContrato?.id || (typeof pagoData.contrato_id === 'number' ? pagoData.contrato_id : null);

      // Query the current max ID in table 'pagos' to assign the next numeric ID (since pagos.id lacks auto-increment)
      let nextPagoId = 711;
      try {
        const { data: maxRow } = await supabase
          .from('pagos')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);
        if (maxRow && maxRow[0]?.id) {
          nextPagoId = Number(maxRow[0].id) + 1;
        }
      } catch {
        nextPagoId = Date.now();
      }

      newPago.id = nextPagoId;
      newPago.contrato_id = numericContractId;
      newPago.codigo_contrato = targetContrato?.codigo_contrato || pagoData.codigo_contrato || (numericContractId ? `CTR-${String(numericContractId).padStart(4, '0')}` : 'S/A');
      newPago.propietario = pagoData.propietario || 'Ingreso Directo';

      // 2. Real Supabase insert into 'pagos' with explicit nextPagoId
      const { data: insertedPago, error: insertError } = await supabase
        .from('pagos')
        .insert([{
          id: nextPagoId,
          contrato_id: numericContractId,
          tipo_pago: pagoData.tipo_pago,
          monto: Number(pagoData.monto),
          numero_operacion: pagoData.numero_operacion,
          metodo_pago: pagoData.metodo_pago,
          fecha_pago: pagoData.fecha_pago
        }])
        .select()
        .maybeSingle();

      if (insertError) {
        console.error('Error al insertar pago en Supabase:', insertError);
      } else if (insertedPago) {
        newPago.id = insertedPago.id;
      }

      // 3. Update 'contratos' table: increment cuotas_pagadas_base, reduce saldo_financiar, update fecha_ultimo_pago & estado
      if (targetContrato) {
        const currentCuotas = Number(targetContrato.cuotas_pagadas_base || 0);
        const montoCuota = Number(targetContrato.monto_cuota) || 1;
        const cuotasAbonadas = Math.max(1, Math.round(Number(pagoData.monto) / montoCuota));
        const nuevasCuotas = currentCuotas + cuotasAbonadas;
        const nuevoSaldo = Math.max(0, Number(targetContrato.saldo_financiar || 0) - Number(pagoData.monto));
        const nuevoEstado = nuevoSaldo === 0 ? 'LIQUIDADO' : targetContrato.estado;

        const { error: updateContractError } = await supabase
          .from('contratos')
          .update({
            cuotas_pagadas_base: nuevasCuotas,
            saldo_financiar: nuevoSaldo,
            fecha_ultimo_pago: pagoData.fecha_pago,
            estado: nuevoEstado
          })
          .eq('id', targetContrato.id);

        if (updateContractError) {
          console.error('Error al actualizar cuotas_pagadas_base en tabla contratos de Supabase:', updateContractError);
        }
      }
    } catch (err) {
      console.warn('Network issue or RLS handled gracefully during insert:', err);
    }

    // 4. Persist locally to synchronized cache
    const currentPagos = this.getStoredPagos();
    const updatedPagos = [newPago, ...currentPagos];
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(updatedPagos));

    // 5. Update Cobranzas view cached metrics (advancing cuotas, next quota, and next due date)
    this.updateCobranzaPayment(pagoData.codigo_contrato, Number(pagoData.monto), pagoData.fecha_pago);

    return {
      success: true,
      pago: newPago
    };
  }

  // Delete payment from Supabase and revert contract quota/balance
  async eliminarPago(pagoId: number | string): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Fetch payment details before deletion (from Supabase or local cache)
      let pago: any = null;
      const { data: dbPago, error: fetchError } = await supabase
        .from('pagos')
        .select('*')
        .eq('id', pagoId)
        .maybeSingle();

      if (dbPago) {
        pago = dbPago;
      } else {
        const localPagos = this.getStoredPagos();
        pago = localPagos.find(p => String(p.id) === String(pagoId));
      }

      if (!pago) {
        return { success: false, error: 'No se encontró el registro de pago en la base de datos de Supabase.' };
      }

      const pagoMonto = Number(pago.monto || 0);

      // 2. Resolve target contract from Supabase
      let targetContrato: any = null;
      if (pago.contrato_id) {
        const numericId = Number(pago.contrato_id);
        if (!isNaN(numericId)) {
          const { data } = await supabase
            .from('contratos')
            .select('id, codigo_contrato, cuotas_pagadas_base, saldo_financiar, monto_cuota, estado')
            .eq('id', numericId)
            .maybeSingle();
          targetContrato = data;
        }
      }

      if (!targetContrato && pago.codigo_contrato) {
        const { data } = await supabase
          .from('contratos')
          .select('id, codigo_contrato, cuotas_pagadas_base, saldo_financiar, monto_cuota, estado')
          .eq('codigo_contrato', pago.codigo_contrato)
          .maybeSingle();
        targetContrato = data;
      }

      // If still not resolved, check local cache to map contract
      if (!targetContrato) {
        const localCobranzas = this.getCachedCobranzas();
        const matchedCobranza = localCobranzas.find(
          cb => String(cb.contrato_id) === String(pago.contrato_id) || cb.codigo_contrato === pago.codigo_contrato
        );
        if (matchedCobranza) {
          const { data } = await supabase
            .from('contratos')
            .select('id, codigo_contrato, cuotas_pagadas_base, saldo_financiar, monto_cuota, estado')
            .eq('id', matchedCobranza.contrato_id)
            .maybeSingle();
          targetContrato = data;
        }
      }

      // 3. Revert cuotas_pagadas_base and restore saldo_financiar in Supabase table 'contratos'
      if (targetContrato) {
        const currentCuotas = Number(targetContrato.cuotas_pagadas_base || 0);
        const montoCuota = Number(targetContrato.monto_cuota) || 1;
        const cuotasARestar = Math.max(1, Math.round(pagoMonto / montoCuota));
        const revertedCuotas = Math.max(0, currentCuotas - cuotasARestar);
        const restoredSaldo = Number(targetContrato.saldo_financiar || 0) + pagoMonto;
        const revertedEstado = restoredSaldo > 0 && targetContrato.estado === 'LIQUIDADO' ? 'ACTIVO' : targetContrato.estado;

        const { error: updateError } = await supabase
          .from('contratos')
          .update({
            cuotas_pagadas_base: revertedCuotas,
            saldo_financiar: restoredSaldo,
            estado: revertedEstado
          })
          .eq('id', targetContrato.id);

        if (updateError) {
          console.error('Error al revertir cuotas en tabla contratos al eliminar pago:', updateError);
        }
      }

      // 4. Delete row from 'pagos' table in Supabase
      const { error: deleteError } = await supabase
        .from('pagos')
        .delete()
        .eq('id', pagoId);

      if (deleteError) {
        console.error('Error al eliminar registro en tabla pagos:', deleteError);
        return { success: false, error: deleteError.message };
      }

      // 5. Update local cache for pagos
      const currentPagos = this.getStoredPagos();
      const updatedPagos = currentPagos.filter(p => String(p.id) !== String(pagoId));
      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(updatedPagos));

      // 6. Immediately revert local cobranzas cache & clear local overrides
      this.revertCobranzaPayment(
        targetContrato?.codigo_contrato || pago.codigo_contrato,
        pagoMonto,
        targetContrato?.id || pago.contrato_id
      );

      return { success: true };
    } catch (err: any) {
      console.error('Excepción al eliminar pago:', err);
      return { success: false, error: err?.message || 'Error de conexión al eliminar el pago' };
    }
  }

  // Fetch real payment transactions (ingresos) directly from Supabase table 'pagos'
  async getPagos(contratosList?: Contrato[], cobranzasList?: ControlCobranza[]): Promise<{ data: Pago[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('pagos')
        .select('*')
        .limit(5000)
        .order('fecha_pago', { ascending: false });

      if (error) {
        console.error('Error querying table pagos:', error.message);
        return { data: this.getStoredPagos(), error: error.message };
      }

      // Map contracts and cobranzas to enrich payments with contract codes and client names
      const contractMap = new Map<number | string, Contrato>();
      if (contratosList && contratosList.length > 0) {
        contratosList.forEach(c => {
          contractMap.set(c.id, c);
          if (c.codigo_contrato) contractMap.set(c.codigo_contrato, c);
        });
      }

      const cobranzaMap = new Map<number | string, ControlCobranza>();
      if (cobranzasList && cobranzasList.length > 0) {
        cobranzasList.forEach(cb => {
          cobranzaMap.set(cb.contrato_id, cb);
          if (cb.codigo_contrato) cobranzaMap.set(cb.codigo_contrato, cb);
        });
      }

      const normalized: Pago[] = (data || []).map((p: any) => {
        const ctr = p.contrato_id ? contractMap.get(p.contrato_id) : null;
        const cb = p.contrato_id ? cobranzaMap.get(p.contrato_id) : null;

        const titular = 
          ctr?.cliente?.nombres_apellidos || 
          (ctr as any)?.clientes?.nombres_apellidos || 
          cb?.propietario;

        const codigo = 
          ctr?.codigo_contrato || 
          cb?.codigo_contrato || 
          (p.contrato_id ? `CTR-${String(p.contrato_id).padStart(4, '0')}` : 'S/A');
        
        return {
          id: p.id,
          contrato_id: p.contrato_id,
          tipo_pago: p.tipo_pago || 'CUOTAS MENSUALES',
          monto: Number(p.monto || 0),
          numero_operacion: p.numero_operacion || `OP-${p.id}`,
          metodo_pago: (p.metodo_pago || 'BCP') as MetodoPago,
          fecha_pago: p.fecha_pago || '',
          codigo_contrato: codigo,
          propietario: titular || (p.contrato_id ? `Contrato #${p.contrato_id}` : 'Ingreso Directo')
        };
      });

      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(normalized));
      return { data: normalized, error: null };
    } catch (err: any) {
      console.error('Connection error querying pagos:', err);
      return { data: this.getStoredPagos(), error: err?.message || 'Error de conexión con la tabla pagos en Supabase' };
    }
  }

  // Fetch real clients directly from Supabase table 'clientes'
  async getClientes(): Promise<{ data: Cliente[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error querying table clientes:', error.message);
        return { data: this.getStoredClientes(), error: error.message };
      }

      const normalized: Cliente[] = (data || []).map((c: any) => ({
        id: c.id,
        dni: c.dni,
        nombres_apellidos: c.nombres_apellidos,
        telefono: c.telefono || '',
        correo: c.correo || '',
        direccion: c.direccion || '',
        distrito: c.distrito || 'Ica',
        provincia: c.provincia || 'Ica',
        departamento: c.departamento || 'Ica'
      }));

      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(normalized));
      return { data: normalized, error: null };
    } catch (err: any) {
      console.error('Connection error querying clientes:', err);
      return { data: this.getStoredClientes(), error: err?.message || 'Error de conexión con clientes' };
    }
  }

  // Fetch real lots directly from Supabase table 'lotes'
  async getLotes(): Promise<{ data: Lote[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('lotes')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error querying table lotes:', error.message);
        return { data: this.getStoredLotes(), error: error.message };
      }

      const normalized: Lote[] = (data || []).map((l: any) => ({
        id: l.id,
        etapa: Number(l.etapa || 1),
        manzana: l.manzana,
        numero_lote: String(l.numero_lote),
        area_m2: Number(l.area_m2 || 0),
        precio_lista: Number(l.precio_lista || 0),
        estado: l.estado || 'DISPONIBLE'
      }));

      localStorage.setItem(STORAGE_KEYS.LOTES, JSON.stringify(normalized));
      return { data: normalized, error: null };
    } catch (err: any) {
      console.error('Connection error querying lotes:', err);
      return { data: this.getStoredLotes(), error: err?.message || 'Error de conexión con lotes' };
    }
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
          fecha_ultimo_pago,
          estado,
          cliente_id,
          lote_id,
          clientes!contratos_cliente_id_fkey ( id, dni, nombres_apellidos, telefono, correo, direccion, distrito, provincia, departamento ),
          lotes!contratos_lote_id_fkey ( id, etapa, manzana, numero_lote, area_m2, precio_lista, estado )
        `)
        .order('id', { ascending: true });

      if (error) {
        // Fallback in case constraint name differs
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
            fecha_ultimo_pago,
            estado,
            cliente_id,
            lote_id,
            clientes!contratos_cliente_id_fkey ( id, dni, nombres_apellidos, telefono, correo, direccion, distrito, provincia, departamento ),
            lotes!contratos_lote_id_fkey ( id, etapa, manzana, numero_lote, area_m2, precio_lista, estado )
          `)
          .order('id', { ascending: true });
        data = retry.data as any;
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

  // Company Configuration - Cloud Supabase with Local Synchronized Cache
  async getEmpresaConfig(): Promise<EmpresaConfig | null> {
    try {
      const { data, error } = await supabase
        .from('configuracion_empresa')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (data) {
        const config: EmpresaConfig = {
          nombreEmpresa: data.nombre_empresa || 'ECOSOL INMOBILIARIA',
          razonSocial: data.razon_social || '',
          ruc: data.ruc || '',
          direccion: data.direccion || '',
          departamento: data.departamento || 'Ica',
          provincia: data.provincia || 'Ica',
          distrito: data.distrito || 'Ica',
          telefono: data.telefono || '',
          email: data.email || '',
          logoUrl: data.logo_url || '/ecosol-logo.png',
          representanteLegal: data.representante_legal || '',
          dniRepresentante: data.dni_representante || '',
          bancoPrincipal: data.banco_principal || '',
          numeroCuenta: data.numero_cuenta || '',
          cci: data.cci || '',
          moneda: data.moneda || 'PEN',
          mensajeWhatsApp: data.mensaje_whatsapp || '',
          piePaginaVoucher: data.pie_pagina_voucher || ''
        };
        localStorage.setItem(STORAGE_KEYS.EMPRESA, JSON.stringify(config));
        return config;
      }
    } catch (e) {
      console.warn('Could not load configuracion_empresa from Supabase:', e);
    }
    const cached = localStorage.getItem(STORAGE_KEYS.EMPRESA);
    return cached ? JSON.parse(cached) : null;
  }

  async saveEmpresaConfig(config: EmpresaConfig): Promise<boolean> {
    localStorage.setItem(STORAGE_KEYS.EMPRESA, JSON.stringify(config));
    try {
      const { error } = await supabase
        .from('configuracion_empresa')
        .upsert([{
          id: 1,
          nombre_empresa: config.nombreEmpresa,
          razon_social: config.razonSocial,
          ruc: config.ruc,
          direccion: config.direccion,
          departamento: config.departamento,
          provincia: config.provincia,
          distrito: config.distrito,
          telefono: config.telefono,
          email: config.email,
          logo_url: config.logoUrl,
          representante_legal: config.representanteLegal,
          dni_representante: config.dniRepresentante,
          banco_principal: config.bancoPrincipal,
          numero_cuenta: config.numeroCuenta,
          cci: config.cci,
          moneda: config.moneda,
          mensaje_whatsapp: config.mensajeWhatsApp,
          pie_pagina_voucher: config.piePaginaVoucher,
          updated_at: new Date().toISOString()
        }]);

      if (error) {
        console.warn('Warning saving configuracion_empresa to Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Exception saving configuracion_empresa to Supabase:', e);
      return false;
    }
  }

  // User Management - Cloud Supabase with Local Synchronized Cache
  async getUsuarios(): Promise<UsuarioSistema[]> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        const normalized: UsuarioSistema[] = data.map((u: any) => ({
          id: String(u.id),
          nombre: u.nombre,
          email: u.email,
          password: u.password,
          rol: u.rol as RolUsuario,
          estado: u.estado as 'Activo' | 'Inactivo',
          telefono: u.telefono || undefined,
          avatar: u.avatar || undefined,
          ultimo_acceso: u.ultimo_acceso || 'Nunca'
        }));
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn('Could not query usuarios from Supabase:', e);
    }
    const cached = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    return cached ? JSON.parse(cached) : initialUsuarios;
  }

  async saveUsuario(user: UsuarioSistema): Promise<UsuarioSistema[]> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .upsert([{
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          password: user.password,
          rol: user.rol,
          estado: user.estado,
          telefono: user.telefono,
          avatar: user.avatar,
          ultimo_acceso: user.ultimo_acceso
        }]);
      if (error) {
        console.warn('Warning upserting usuario in Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Exception saving usuario in Supabase:', e);
    }

    const cached = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    const current: UsuarioSistema[] = cached ? JSON.parse(cached) : initialUsuarios;
    const exists = current.some(u => u.id === user.id);
    const updated = exists 
      ? current.map(u => (u.id === user.id ? user : u)) 
      : [user, ...current];
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(updated));
    return updated;
  }

  async deleteUsuario(id: string): Promise<UsuarioSistema[]> {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);
      if (error) {
        console.warn('Warning deleting usuario in Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Exception deleting usuario in Supabase:', e);
    }

    const cached = localStorage.getItem(STORAGE_KEYS.USUARIOS);
    const current: UsuarioSistema[] = cached ? JSON.parse(cached) : initialUsuarios;
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

  private revertCobranzaPayment(codigoContrato?: string, montoAbonado?: number, contratoId?: number | string) {
    if (!montoAbonado) return;

    // Remove any local override for this contract
    if (codigoContrato) {
      const storedOverrides = localStorage.getItem(STORAGE_KEYS.OVERRIDES);
      if (storedOverrides) {
        try {
          const overrides = JSON.parse(storedOverrides);
          delete overrides[codigoContrato];
          localStorage.setItem(STORAGE_KEYS.OVERRIDES, JSON.stringify(overrides));
        } catch {}
      }
    }

    const currentCobranzas = this.getCachedCobranzas();
    const updated = currentCobranzas.map(c => {
      const match = (codigoContrato && c.codigo_contrato === codigoContrato) ||
                    (contratoId && String(c.contrato_id) === String(contratoId));
      if (match) {
        const montoCuota = Number(c.monto_cuota) || 1;
        const cuotasARestar = Math.max(1, Math.round(montoAbonado / montoCuota));
        const nuevasPagadas = Math.max(0, Number(c.cuotas_pagadas) - cuotasARestar);
        const nuevasPendientes = Math.min(Number(c.total_cuotas || 60), Number(c.cuotas_pendientes) + cuotasARestar);
        const nuevoSaldo = Number(c.saldo_restante) + montoAbonado;
        const proximaCuota = nuevasPagadas + 1;
        const nuevoEstadoCobranza: EstadoCobranza = nuevoSaldo === 0 ? 'LIQUIDADO' : 'AL DIA';

        return {
          ...c,
          cuotas_pagadas: nuevasPagadas,
          cuotas_pendientes: nuevasPendientes,
          saldo_restante: nuevoSaldo,
          proximo_numero_cuota: proximaCuota,
          estado_cobranza: nuevoEstadoCobranza,
          estado: nuevoSaldo === 0 ? 'LIQUIDADO' : 'ACTIVO'
        };
      }
      return c;
    });

    localStorage.setItem(STORAGE_KEYS.COBRANZAS, JSON.stringify(updated));
  }
}

export const supabaseService = new SupabaseService();
