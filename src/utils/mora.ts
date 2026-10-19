import { ControlCobranza } from '../types/database';

export interface MoraInfo {
  /** Número de cuotas cuyo vencimiento ya pasó y no han sido pagadas */
  cuotasVencidas: number;
  /** Monto total adeudado por las cuotas vencidas (S/) */
  montoVencido: number;
  /** Días transcurridos desde la cuota vencida más antigua */
  diasAtraso: number;
  /** Fecha (YYYY-MM-DD) de la cuota vencida más antigua */
  vencidaDesde: string | null;
  /** Números de cuota vencidos (ej. [21, 22, 23]) */
  numerosCuotas: number[];
}

const EMPTY: MoraInfo = { cuotasVencidas: 0, montoVencido: 0, diasAtraso: 0, vencidaDesde: null, numerosCuotas: [] };

const parseISO = (s?: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Suma meses respetando el día ancla y ajustando a fin de mes (ej. 30 → 28 Feb). */
const addMonthsClamped = (base: Date, months: number, anchorDay: number) => {
  const y = base.getFullYear();
  const m = base.getMonth() + months;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(anchorDay, lastDay));
};

/**
 * Calcula cuántas cuotas debe un contrato a la fecha de hoy.
 * Parte de la próxima cuota pendiente (proximo_vencimiento) y cuenta cada vencimiento
 * mensual que ya pasó, sin exceder las cuotas pendientes del contrato.
 */
export const calcularMora = (c: ControlCobranza, hoy: Date = new Date()): MoraInfo => {
  const isLiquidado = c.estado_cobranza === 'LIQUIDADO' || Number(c.saldo_restante) <= 0 || Number(c.cuotas_pendientes) <= 0;
  if (isLiquidado || c.estado === 'DESISTIDO') return EMPTY;

  const primerVenc = parseISO(c.proximo_vencimiento);
  if (!primerVenc) return EMPTY;

  const today = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const anchorDay = parseISO(c.fecha_primer_pago)?.getDate() || primerVenc.getDate();
  const pendientes = Math.max(0, Number(c.cuotas_pendientes) || 0);
  const primeraCuota = Number(c.proximo_numero_cuota) || (Number(c.cuotas_pagadas) || 0) + 1;

  const numerosCuotas: number[] = [];
  for (let k = 0; k < pendientes; k++) {
    const due = k === 0 ? primerVenc : addMonthsClamped(primerVenc, k, anchorDay);
    if (due < today) numerosCuotas.push(primeraCuota + k);
    else break;
  }

  // Si la vista marca EN MORA pero el cálculo no detecta vencimientos, al menos 1 cuota está vencida
  if (numerosCuotas.length === 0 && c.estado_cobranza === 'EN MORA' && pendientes > 0) {
    numerosCuotas.push(primeraCuota);
  }

  if (numerosCuotas.length === 0) return EMPTY;

  const cuotasVencidas = numerosCuotas.length;
  const montoVencido = Math.min(cuotasVencidas * (Number(c.monto_cuota) || 0), Number(c.saldo_restante) || Infinity);
  const diasAtraso = Math.max(0, Math.floor((today.getTime() - primerVenc.getTime()) / 86400000));

  return { cuotasVencidas, montoVencido, diasAtraso, vencidaDesde: toISO(primerVenc), numerosCuotas };
};

/** Nivel de severidad de la mora para colores/etiquetas */
export const nivelMora = (cuotasVencidas: number): 'leve' | 'moderada' | 'grave' | null => {
  if (cuotasVencidas <= 0) return null;
  if (cuotasVencidas === 1) return 'leve';
  if (cuotasVencidas <= 3) return 'moderada';
  return 'grave';
};
