export type EstadoLote = 'VENDIDO' | 'DISPONIBLE' | 'DESISTIDO';
export type EstadoContrato = 'ACTIVO' | 'LIQUIDADO' | 'DESISTIDO';
export type FormaCompra = 'CREDITO' | 'CONTADO';
export type TipoPago = 'CUOTA' | 'CUOTAS MENSUALES' | 'INICIAL' | 'AL CONTADO' | 'SEPARACION' | 'AMORTIZACION' | string;
export type MetodoPago = 'BCP' | 'YAPE' | 'INTERBANK' | 'BANBIF' | 'EFECTIVO';
export type TipoEgreso = 'FIJO' | 'VARIABLE';
export type CategoriaEgreso = 
  | 'INFRAESTRUCTURA Y SERVICIO'
  | 'SUELDOS'
  | 'OBLIGACIONES Y FINANZAS'
  | 'PUBLICIDAD Y MARKETING'
  | 'COMISIONES DE VENTAS'
  | 'TRANSPORTE Y MOVILIDAD'
  | 'MANTENIMIENTO Y OBRAS'
  | 'REFRIGERIOS Y EVENTOS'
  | 'GASTOS ADMINISTRATIVOS MENORES'
  | string;

export type EstadoCobranza = 'AL DIA' | 'VENCE HOY' | 'POR VENCER' | 'EN MORA' | 'LIQUIDADO';

export type RolUsuario = 'Administrador' | 'Cobranzas / Caja' | 'Asesor de Ventas';

export interface UsuarioSistema {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  estado: 'Activo' | 'Inactivo';
  ultimo_acceso: string;
  avatar?: string;
  telefono?: string;
}

export interface Cliente {
  id: number | string;
  dni: string;
  nombres_apellidos: string;
  telefono: string;
  correo: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
}

export interface Lote {
  id: number | string;
  etapa: number;
  manzana: string;
  numero_lote: string;
  area_m2: number;
  precio_lista: number;
  estado: EstadoLote;
}

export interface Contrato {
  id: number | string;
  codigo_contrato: string;
  cliente_id?: number | string;
  lote_id?: number | string;
  asesor?: string;
  mes_contrato?: string;
  forma_compra: FormaCompra;
  precio_venta: number;
  monto_inicial: number;
  saldo_financiar: number;
  cantidad_cuotas: number;
  monto_cuota: number;
  cuotas_pagadas_base?: number;
  fecha_primer_pago?: string;
  fecha_ultimo_pago?: string;
  estado: EstadoContrato;
  cliente?: Cliente;
  clientes?: { dni?: string; nombres_apellidos?: string; telefono?: string; [key: string]: any };
  lote?: Lote;
  lotes?: { etapa?: number; manzana?: string; numero_lote?: string; area_m2?: number; [key: string]: any };
}

export interface Pago {
  id: number | string;
  contrato_id?: number | string | null;
  tipo_pago: TipoPago;
  monto: number;
  numero_operacion: string;
  metodo_pago: MetodoPago;
  fecha_pago: string;
  codigo_contrato?: string;
  propietario?: string;
}

export interface Egreso {
  id: number | string;
  fecha: string;
  tipo: TipoEgreso;
  categoria: CategoriaEgreso | string;
  descripcion: string;
  monto: number;
  comprobante?: string;
}

export interface ControlCobranza {
  contrato_id: number | string;
  codigo_contrato: string;
  dni: string;
  propietario: string;
  telefono: string;
  etapa: number;
  manzana: string;
  numero_lote: string;
  precio_venta: number;
  monto_inicial: number;
  total_cuotas: number;
  monto_cuota: number;
  saldo_financiar: number;
  fecha_primer_pago: string;
  cuotas_pagadas: number;
  cuotas_pendientes: number;
  saldo_restante: number;
  proximo_vencimiento: string;
  proximo_numero_cuota: number;
  estado_cobranza: EstadoCobranza;
  estado?: string;
}

export interface UsuarioAuth {
  id: string;
  email: string;
  nombres: string;
  rol: RolUsuario;
  avatar?: string;
}

export interface EmpresaConfig {
  nombreEmpresa: string;
  razonSocial: string;
  ruc: string;
  direccion: string;
  departamento: string;
  provincia: string;
  distrito: string;
  telefono: string;
  email: string;
  logoUrl: string;
  representanteLegal: string;
  dniRepresentante: string;
  bancoPrincipal: string;
  numeroCuenta: string;
  cci: string;
  moneda: string;
  mensajeWhatsApp: string;
  piePaginaVoucher: string;
}
