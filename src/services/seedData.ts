import { Cliente, Lote, Contrato, Pago, Egreso, ControlCobranza, UsuarioSistema } from '../types/database';
import rawCobranzas from '../data_cobranzas_dump.json';

// Normalize cobranzas from dump with new database view fields
export const initialCobranzas: ControlCobranza[] = (rawCobranzas as any[]).map((c, idx) => {
  const precioVenta = Number(c.precio_venta || 12000);
  const montoInicial = Number(c.monto_inicial || 1000);
  const totalCuotas = Number(c.total_cuotas || 60);
  const cuotasPagadas = Number(c.cuotas_pagadas || 0);
  const cuotasPendientes = Number(c.cuotas_pendientes ?? (totalCuotas - cuotasPagadas));
  const saldoRestante = Number(c.saldo_restante ?? (precioVenta - montoInicial - (cuotasPagadas * Number(c.monto_cuota || 150))));
  const proximaCuotaNum = cuotasPagadas + 1;

  // Derive next due date if not present
  let proximoVenc = c.proximo_vencimiento;
  if (!proximoVenc) {
    const d = new Date();
    d.setDate(d.getDate() + ((idx * 3) % 25) - 5);
    proximoVenc = d.toISOString().split('T')[0];
  }

  // Derive estado_cobranza
  let estadoCobranza = c.estado_cobranza;
  if (!estadoCobranza) {
    if (saldoRestante === 0 || cuotasPendientes === 0) {
      estadoCobranza = 'LIQUIDADO';
    } else if (c.estado === 'DESISTIDO') {
      estadoCobranza = 'EN MORA';
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      if (proximoVenc < todayStr) {
        estadoCobranza = 'EN MORA';
      } else if (proximoVenc === todayStr) {
        estadoCobranza = 'VENCE HOY';
      } else {
        const diffDays = Math.ceil((new Date(proximoVenc).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24));
        estadoCobranza = diffDays <= 7 ? 'POR VENCER' : 'AL DIA';
      }
    }
  }

  return {
    contrato_id: c.contrato_id || (idx + 1),
    codigo_contrato: c.codigo_contrato,
    dni: c.dni,
    propietario: c.propietario,
    telefono: c.telefono,
    etapa: Number(c.etapa || 1),
    manzana: c.manzana,
    numero_lote: c.numero_lote,
    precio_venta: precioVenta,
    monto_inicial: montoInicial,
    total_cuotas: totalCuotas,
    monto_cuota: Number(c.monto_cuota || 150),
    saldo_financiar: Number(c.saldo_financiar || (precioVenta - montoInicial)),
    fecha_primer_pago: c.fecha_primer_pago || '2024-11-30',
    cuotas_pagadas: cuotasPagadas,
    cuotas_pendientes: cuotasPendientes,
    saldo_restante: saldoRestante,
    proximo_vencimiento: proximoVenc,
    proximo_numero_cuota: c.proximo_numero_cuota || proximaCuotaNum,
    estado_cobranza: estadoCobranza,
    estado: c.estado || 'ACTIVO'
  };
});

// Initial System Users for RBAC
export const initialUsuarios: UsuarioSistema[] = [
  {
    id: 'usr-001',
    nombre: 'Lic. Roberto Mendoza V.',
    email: 'admin.gerencia@ecosol.pe',
    rol: 'Administrador',
    estado: 'Activo',
    ultimo_acceso: 'Hace 5 minutos',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    telefono: '952473876'
  },
  {
    id: 'usr-002',
    nombre: 'Sandra Morales Prado',
    email: 'cobranzas.caja@ecosol.pe',
    rol: 'Cobranzas / Caja',
    estado: 'Activo',
    ultimo_acceso: 'Hace 18 minutos',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250',
    telefono: '987446567'
  },
  {
    id: 'usr-003',
    nombre: 'Carlos Mendoza Torres',
    email: 'asesor.ventas@ecosol.pe',
    rol: 'Asesor de Ventas',
    estado: 'Activo',
    ultimo_acceso: 'Hace 1 hora',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    telefono: '991272997'
  },
  {
    id: 'usr-004',
    nombre: 'Valeria Rojas Luján',
    email: 'valeria.rojas@ecosol.pe',
    rol: 'Asesor de Ventas',
    estado: 'Activo',
    ultimo_acceso: 'Ayer, 18:30',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=250',
    telefono: '900314396'
  },
  {
    id: 'usr-005',
    nombre: 'Fernando Quispe Meza',
    email: 'fernando.quispe@ecosol.pe',
    rol: 'Asesor de Ventas',
    estado: 'Inactivo',
    ultimo_acceso: '10 Oct 2026',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
    telefono: '953474393'
  }
];

// Generate full relational dataset matching the 126 live contracts
export function generateRelationalSeed() {
  const distritos = ['Ica', 'Parcona', 'Subtanjalla', 'La Tinguiña', 'Santiago', 'Los Aquijes', 'Chincha Alta', 'Pisco', 'Lima'];
  const asesores = ['Carlos Mendoza Torres', 'Valeria Rojas Luján', 'Fernando Quispe Meza', 'Ana Lucía Benites', 'Jorge Huamán'];
  const metodos: ('BCP' | 'YAPE' | 'INTERBANK' | 'BANBIF' | 'EFECTIVO')[] = ['BCP', 'YAPE', 'INTERBANK', 'BANBIF', 'EFECTIVO'];

  const clientes: Cliente[] = [];
  const lotes: Lote[] = [];
  const contratos: Contrato[] = [];
  const pagos: Pago[] = [];

  const seenLoteKey = new Set<string>();

  // Process live contracts
  initialCobranzas.forEach((c, index) => {
    const clienteId = index + 1;
    const loteId = index + 1;
    const cleanMz = (c.manzana || 'A').toUpperCase().trim();
    const cleanLt = String(c.numero_lote || '1').trim();
    const loteKey = `${c.etapa}-${cleanMz}-${cleanLt}`;
    seenLoteKey.add(loteKey);

    // Cliente
    const emailName = c.propietario.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.').slice(0, 18);
    const distrito = distritos[index % distritos.length];
    const cliente: Cliente = {
      id: clienteId,
      dni: c.dni,
      nombres_apellidos: c.propietario,
      telefono: c.telefono,
      correo: `${emailName}@gmail.com`,
      direccion: `Av. Los Libertadores #${100 + (index * 7) % 890}`,
      distrito: distrito,
      provincia: 'Ica',
      departamento: 'Ica'
    };
    clientes.push(cliente);

    // Lote
    const loteEstado = c.estado === 'DESISTIDO' ? 'DESISTIDO' : 'VENDIDO';
    const area = 120 + ((index * 5) % 80);
    const lote: Lote = {
      id: loteId,
      etapa: Number(c.etapa) || 1,
      manzana: cleanMz,
      numero_lote: cleanLt,
      area_m2: area,
      precio_lista: Number(c.precio_venta) || 12000,
      estado: loteEstado
    };
    lotes.push(lote);

    // Contrato
    // Make 10 of the active contracts "CONTADO" to satisfy MÓDULO 3 requirement:
    // "Regla de negocio para VENTAS AL CONTADO: Deben reflejarse con Saldo S/ 0.00, cuotas pendientes 0 y badge destacado en verde esmeralda 'LIQUIDADO'"
    const isContado = (index % 12 === 0 && c.estado !== 'DESISTIDO');
    const formaCompra = isContado ? 'CONTADO' : 'CREDITO';
    const contratoEstado = isContado ? 'LIQUIDADO' : (c.estado === 'DESISTIDO' ? 'DESISTIDO' : 'ACTIVO');
    const totalCuotas = isContado ? 1 : Number(c.total_cuotas || 60);
    const cuotasPagadas = isContado ? 1 : Number(c.cuotas_pagadas || 1);
    const precioVenta = Number(c.precio_venta) || 12000;
    const montoInicial = isContado ? precioVenta : Number(c.monto_inicial || 1000);
    const montoCuota = isContado ? 0 : Number(c.monto_cuota || 150);

    const contrato: Contrato = {
      id: clienteId,
      codigo_contrato: c.codigo_contrato,
      cliente_id: clienteId,
      lote_id: loteId,
      asesor: asesores[index % asesores.length],
      mes_contrato: `2024-${String((index % 12) + 1).padStart(2, '0')}`,
      forma_compra: formaCompra,
      precio_venta: precioVenta,
      monto_inicial: montoInicial,
      saldo_financiar: isContado ? 0 : (precioVenta - montoInicial),
      cantidad_cuotas: totalCuotas,
      monto_cuota: montoCuota,
      cuotas_pagadas_base: cuotasPagadas,
      fecha_primer_pago: '2024-01-15',
      fecha_ultimo_pago: '2026-09-20',
      estado: contratoEstado,
      cliente: cliente,
      lote: lote
    };
    contratos.push(contrato);

    // Initial payment
    pagos.push({
      id: `PAG-INI-${clienteId}`,
      contrato_id: clienteId,
      tipo_pago: isContado ? 'AL CONTADO' : 'INICIAL',
      monto: montoInicial,
      numero_operacion: `OP-INI-${700000 + clienteId}`,
      metodo_pago: metodos[index % metodos.length],
      fecha_pago: '2024-01-10',
      codigo_contrato: c.codigo_contrato,
      propietario: c.propietario
    });

    // Recent installments
    const cuotasToGenerate = Math.min(cuotasPagadas, 3);
    for (let k = 1; k <= cuotasToGenerate; k++) {
      pagos.push({
        id: `PAG-CUO-${clienteId}-${k}`,
        contrato_id: clienteId,
        tipo_pago: 'CUOTA',
        monto: montoCuota,
        numero_operacion: `OP-${800000 + clienteId * 10 + k}`,
        metodo_pago: metodos[(index + k) % metodos.length],
        fecha_pago: `2026-${String(Math.max(1, 10 - k)).padStart(2, '0')}-15`,
        codigo_contrato: c.codigo_contrato,
        propietario: c.propietario
      });
    }
  });

  // Also generate DISPONIBLE lots to populate the interactive digital subdivision map (Plano Digital)
  const allMz = ['A', 'B', 'D', 'E', 'F', "F'", 'G', 'H', 'I', 'J', 'K', 'L', 'L1', "M'", "N'", "O'", "P'", 'Q1', 'R1', "S'", 'S1', 'T', "T'", 'T1', 'U'];
  let extraLoteId = 500;
  allMz.forEach((mz) => {
    for (let ltNum = 1; ltNum <= 10; ltNum++) {
      const key1 = `1-${mz}-${ltNum}`;
      if (!seenLoteKey.has(key1)) {
        seenLoteKey.add(key1);
        lotes.push({
          id: ++extraLoteId,
          etapa: 1,
          manzana: mz,
          numero_lote: String(ltNum),
          area_m2: 120 + ((ltNum * 7) % 60),
          precio_lista: 9500 + ((ltNum * 400) % 4000),
          estado: 'DISPONIBLE'
        });
      }
    }
  });

  // Operating Expenses (Egresos) for Caja Chica
  const egresos: Egreso[] = [
    { id: 1, fecha: '2026-10-15', tipo: 'FIJO', categoria: 'Sueldos y Comisiones', descripcion: 'Pago planilla primera quincena asesores de venta', monto: 8500.00, comprobante: 'PL-2026-10A' },
    { id: 2, fecha: '2026-10-14', tipo: 'VARIABLE', categoria: 'Publicidad y Marketing', descripcion: 'Campaña publicitaria Meta Ads & TikTok Lotes Ica', monto: 1850.00, comprobante: 'INV-FB-91823' },
    { id: 3, fecha: '2026-10-12', tipo: 'FIJO', categoria: 'Servicios Básicos', descripcion: 'Luz del Sur y Agua caseta de ventas proyecto', monto: 420.50, comprobante: 'REC-LUZ-8273' },
    { id: 4, fecha: '2026-10-11', tipo: 'FIJO', categoria: 'Alquiler y Caseta', descripcion: 'Alquiler mensual caseta de atención y showroom Ica', monto: 2500.00, comprobante: 'REC-ALQ-1049' },
    { id: 5, fecha: '2026-10-10', tipo: 'VARIABLE', categoria: 'Movilidad y Viáticos', descripcion: 'Combustible y peajes transporte clientes visita guiada', monto: 680.00, comprobante: 'FAC-PET-0918' },
    { id: 6, fecha: '2026-10-08', tipo: 'VARIABLE', categoria: 'Notaría y Trámites Legales', descripcion: 'Gastos notariales escrituración y minutas lotes', monto: 1450.00, comprobante: 'NOT-ICA-4491' },
    { id: 7, fecha: '2026-10-05', tipo: 'FIJO', categoria: 'Mantenimiento y Oficina', descripcion: 'Materiales de oficina, tóner y hojas membretadas', monto: 320.00, comprobante: 'BOL-OF-0192' },
    { id: 8, fecha: '2026-09-30', tipo: 'FIJO', categoria: 'Sueldos y Comisiones', descripcion: 'Comisiones comerciales cierre de ventas mes de septiembre', monto: 6200.00, comprobante: 'REC-HON-0933' },
    { id: 9, fecha: '2026-09-28', tipo: 'VARIABLE', categoria: 'Publicidad y Marketing', descripcion: 'Impresión de gigantografías y volantes publicitarios', monto: 750.00, comprobante: 'FAC-IMP-1029' },
    { id: 10, fecha: '2026-09-22', tipo: 'VARIABLE', categoria: 'Mantenimiento y Oficina', descripcion: 'Mantenimiento y desbroce de vías en terreno loteo', monto: 2100.00, comprobante: 'REC-SRV-8821' },
    { id: 11, fecha: '2026-09-15', tipo: 'FIJO', categoria: 'Sueldos y Comisiones', descripcion: 'Pago planilla quincenal staff administrativo y seguridad', monto: 4500.00, comprobante: 'PL-2026-09B' }
  ];

  return { clientes, lotes, contratos, pagos, egresos, usuarios: initialUsuarios };
}
