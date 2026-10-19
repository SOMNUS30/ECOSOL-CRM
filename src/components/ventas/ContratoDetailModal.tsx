import React, { useState, useEffect, useMemo } from 'react';
import { Contrato, Pago } from '../../types/database';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import { 
  X, 
  User, 
  CreditCard, 
  FileText, 
  Building2, 
  Plus,
  Eye,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface ContratoDetailModalProps {
  contrato: Contrato | null;
  onClose: () => void;
}

export const ContratoDetailModal: React.FC<ContratoDetailModalProps> = ({ contrato: initialContrato, onClose }) => {
  const { pagos = [], setSelectedContractForPayment, cobranzas = [], eliminarPago, setActiveVoucher, contratos = [], setSelectedContractDetail } = useData();
  const [contrato, setContrato] = useState<Contrato | null>(initialContrato);
  const [pagoToDelete, setPagoToDelete] = useState<Pago | null>(null);
  const [isDeletingPago, setIsDeletingPago] = useState<boolean>(false);

  useEffect(() => {
    setContrato(initialContrato);
  }, [initialContrato]);

  // ALL hooks MUST be called unconditionally at the top of the component before any early return!
  const contractPagos = useMemo(() => {
    if (!contrato) return [];
    return (pagos || []).filter(
      p => String(p.contrato_id) === String(contrato.id) ||
           (p.codigo_contrato && p.codigo_contrato === contrato.codigo_contrato)
    );
  }, [pagos, contrato]);

  const clientContracts = useMemo(() => {
    if (!contrato) return [];
    const cliente = contrato.cliente || (contrato as any).clientes;
    const dni = cliente?.dni;
    const clId = contrato.cliente_id;
    const nombre = (cliente?.nombres_apellidos || '').trim().toLowerCase();

    const matches = (contratos || []).filter(c => {
      if (!c) return false;
      const cCli = c.cliente || (c as any).clientes;
      if (dni && cCli?.dni && cCli.dni === dni) return true;
      if (clId && c.cliente_id && String(c.cliente_id) === String(clId)) return true;
      if (nombre && cCli?.nombres_apellidos && cCli.nombres_apellidos.trim().toLowerCase() === nombre) return true;
      return String(c.id) === String(contrato.id);
    });

    return matches.length > 0 ? matches : [contrato];
  }, [contratos, contrato]);

  const totalAbonadoLote = useMemo(() => {
    return contractPagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
  }, [contractPagos]);

  // Early return after all hooks are executed
  if (!contrato) return null;

  const isContado = contrato.forma_compra === 'CONTADO' || contrato.estado === 'LIQUIDADO';
  const cliente = contrato.cliente || (contrato as any).clientes;
  const lote = contrato.lote || (contrato as any).lotes;
  const matchCobranza = (cobranzas || []).find(c => c.codigo_contrato === contrato.codigo_contrato);

  const handleSelectContract = (c: Contrato) => {
    setContrato(c);
    setSelectedContractDetail(c);
  };

  const handleOpenAbonar = () => {
    if (matchCobranza) {
      onClose();
      setSelectedContractForPayment(matchCobranza);
    }
  };

  const handleConfirmDeletePago = async () => {
    if (!pagoToDelete) return;
    setIsDeletingPago(true);
    try {
      const res = await eliminarPago(pagoToDelete.id);
      if (res.success) {
        toast.success('Pago anulado exitosamente', {
          description: `Se eliminó el pago de S/ ${Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })} y se actualizó el contrato.`
        });
        setPagoToDelete(null);
      } else {
        toast.error('Error al anular pago', {
          description: res.error || 'No se pudo anular el pago en Supabase.'
        });
      }
    } catch (err: any) {
      toast.error('Error', {
        description: err?.message || 'Error inesperado al anular el pago.'
      });
    } finally {
      setIsDeletingPago(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Expediente de Contrato: {contrato.codigo_contrato}
                </h2>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-700">
                  Mz {lote?.manzana || '-'} Lt {lote?.numero_lote || '-'}
                </span>
                {isContado ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    Liquidado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {contrato.estado}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Asesor: <span className="text-slate-700 font-medium">{contrato.asesor || 'Sin asesor asignado'}</span> • Periodo: {contrato.mes_contrato || 'N/D'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Multilot Selector Banner when client owns multiple lots */}
          {clientContracts.length > 1 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lotes de este cliente ({clientContracts.length} contratos independientes):</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Seleccione un lote para ver su ficha y cuotas independientes
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {clientContracts.map(c => {
                  const isCurrent = String(c.id) === String(contrato.id) || c.codigo_contrato === contrato.codigo_contrato;
                  const cLote = c.lote || (c as any).lotes;
                  const cPagosCount = pagos.filter(p => String(p.contrato_id) === String(c.id) || p.codigo_contrato === c.codigo_contrato).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContract(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-2 border ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                      }`}
                    >
                      <span className="font-mono font-bold">{c.codigo_contrato}</span>
                      <span className={isCurrent ? 'text-emerald-200' : 'text-slate-300'}>•</span>
                      <span>Mz {cLote?.manzana || '-'} Lt {cLote?.numero_lote || '-'}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        isCurrent ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cPagosCount} {cPagosCount === 1 ? 'pago' : 'pagos'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Dossier: Cliente + Lote */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Ficha del Cliente */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-800 font-semibold text-xs">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Datos del Propietario</span>
                </div>
                {clientContracts.length > 1 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {clientContracts.length} lotes adquiridos
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Nombres y Apellidos</span>
                <span className="text-slate-900 font-medium text-xs block">{cliente?.nombres_apellidos || 'Sin titular registrado'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">DNI</span>
                  <span className="text-slate-800 font-medium font-mono">{cliente?.dni || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Teléfono</span>
                  <span className="text-slate-800 font-medium">{cliente?.telefono || '-'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Correo</span>
                <span className="text-slate-700 truncate block">{cliente?.correo || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Dirección</span>
                <span className="text-slate-700 block">
                  {cliente?.direccion ? `${cliente.direccion}${cliente.distrito ? `, ${cliente.distrito}` : ''}` : '-'}
                </span>
              </div>
            </div>

            {/* Ficha del Lote */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-800 font-semibold text-xs">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Datos de este Inmueble</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  Contrato {contrato.codigo_contrato}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Etapa</span>
                  <span className="text-slate-900 font-medium">Etapa {lote?.etapa ?? 1}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Manzana</span>
                  <span className="text-slate-900 font-bold text-emerald-800 font-mono">Mz {lote?.manzana || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Lote</span>
                  <span className="text-slate-900 font-bold text-emerald-800 font-mono">Lt {lote?.numero_lote || '-'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Área</span>
                  <span className="text-slate-800 font-medium">{lote?.area_m2 ? `${lote.area_m2} m²` : 'N/D'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Precio de Venta</span>
                  <span className="text-slate-800 font-medium">S/ {Number(contrato.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Modalidad</span>
                  <span className="text-slate-800 font-medium block mt-0.5">
                    {isContado ? 'Venta al Contado' : 'Crédito Directo'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Plan de Cuotas</span>
                  <span className="text-slate-800 font-medium block mt-0.5">
                    {isContado ? '1 cuota (Contado)' : `${contrato.cantidad_cuotas} cuotas`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen Financiero del Contrato */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div>
              <span className="text-slate-500 block text-[11px]">Precio de Venta</span>
              <span className="text-sm font-semibold text-slate-900 block mt-0.5">
                S/ {Number(contrato.precio_venta).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Cuota Inicial</span>
              <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                S/ {Number(contrato.monto_inicial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Cantidad de Cuotas</span>
              <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                {isContado ? '1 cuota' : `${contrato.cantidad_cuotas} cuotas`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Cuota Mensual</span>
              <span className="text-sm font-semibold text-slate-700 block mt-0.5">
                {isContado ? 'S/ 0.00' : `S/ ${Number(contrato.monto_cuota).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Saldo Pendiente</span>
              <span className={`text-sm font-semibold block mt-0.5 ${isContado ? 'text-emerald-700' : 'text-slate-900'}`}>
                {isContado ? 'S/ 0.00' : `S/ ${Number(contrato.saldo_financiar).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </div>


          {/* Chronological Payment History Table */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <h3 className="font-semibold text-slate-800 text-xs">
                    Historial de Pagos de este Lote: Mz {lote?.manzana || '-'} Lt {lote?.numero_lote || '-'} ({contractPagos.length} pagos)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Cuotas y abonos registrados exclusivamente para este contrato. Total abonado: <span className="font-medium text-emerald-700">S/ {totalAbonadoLote.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
              <button
                onClick={handleOpenAbonar}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Registrar Pago en este Lote</span>
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">N° Operación</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {contractPagos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 space-y-1">
                        <p className="font-semibold text-slate-600">
                          No hay pagos registrados para este lote específico ({contrato.codigo_contrato}: Mz {lote?.manzana || '-'} Lt {lote?.numero_lote || '-'}).
                        </p>
                        {clientContracts.length > 1 && (
                          <p className="text-[11px] text-slate-400">
                            Este cliente posee {clientContracts.length} lotes. Seleccione otro lote en la barra superior para revisar sus respectivos abonos.
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    contractPagos.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {p.fecha_pago}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {p.tipo_pago}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 text-[11px]">
                          {p.numero_operacion}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {p.metodo_pago}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                          S/ {Number(p.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setActiveVoucher(p)}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              title="Ver Comprobante Voucher"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Voucher</span>
                            </button>
                            <button
                              onClick={() => setPagoToDelete(p)}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                              title="Anular pago y revertir cuota"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Anular</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Sincronizado con Supabase
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Anular / Eliminar Pago */}
      {pagoToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Anular y Eliminar Pago
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Reversión de cuota en contrato {contrato.codigo_contrato}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isDeletingPago && setPagoToDelete(null)}
                disabled={isDeletingPago}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>N° Operación:</span>
                  <span className="font-mono font-bold text-slate-900">{pagoToDelete.numero_operacion || 'S/N'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Monto Abonado:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    S/ {Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Fecha:</span>
                  <span className="text-slate-800">{pagoToDelete.fecha_pago}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Canal:</span>
                  <span className="font-semibold text-slate-800">{pagoToDelete.metodo_pago}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] leading-relaxed space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Impacto directo en este contrato:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800/90 pl-1">
                  <li>Se eliminará el abono de la base de datos de Supabase.</li>
                  <li>Se <b>restará la cuota pagada</b> de este cliente.</li>
                  <li>Se <b>restaurará la deuda pendiente</b> por S/ {Number(pagoToDelete.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPagoToDelete(null)}
                  disabled={isDeletingPago}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeletePago}
                  disabled={isDeletingPago}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingPago ? 'Anulando...' : 'Sí, Anular Pago'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
