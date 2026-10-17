import React from 'react';
import { Contrato } from '../../types/database';
import { useData } from '../../context/DataContext';
import { 
  X, 
  User, 
  CreditCard, 
  FileText, 
  Building2, 
  Plus
} from 'lucide-react';

interface ContratoDetailModalProps {
  contrato: Contrato | null;
  onClose: () => void;
}

export const ContratoDetailModal: React.FC<ContratoDetailModalProps> = ({ contrato, onClose }) => {
  const { pagos, setSelectedContractForPayment, cobranzas } = useData();

  if (!contrato) return null;

  // Payments matching this contract
  const contractPagos = pagos.filter(
    p => p.codigo_contrato === contrato.codigo_contrato || String(p.contrato_id) === String(contrato.id)
  );

  const isContado = contrato.forma_compra === 'CONTADO' || contrato.estado === 'LIQUIDADO';
  const cliente = contrato.cliente || (contrato as any).clientes;
  const lote = contrato.lote || (contrato as any).lotes;
  const matchCobranza = cobranzas.find(c => c.codigo_contrato === contrato.codigo_contrato);

  const handleOpenAbonar = () => {
    if (matchCobranza) {
      onClose();
      setSelectedContractForPayment(matchCobranza);
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
          {/* Top Dossier: Cliente + Lote */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Ficha del Cliente */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-xs">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Datos del Propietario</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Nombres y Apellidos</span>
                <span className="text-slate-900 font-medium text-xs block">{cliente?.nombres_apellidos || 'Sin titular registrado'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">DNI</span>
                  <span className="text-slate-800 font-medium">{cliente?.dni || '-'}</span>
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
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 text-slate-800 font-semibold text-xs">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Datos del Inmueble</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Etapa</span>
                  <span className="text-slate-900 font-medium">Etapa {lote?.etapa ?? 1}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Manzana</span>
                  <span className="text-slate-900 font-medium">Mz {lote?.manzana || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Lote</span>
                  <span className="text-slate-900 font-medium">Lt {lote?.numero_lote || '-'}</span>
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
                  <span className="text-slate-500 block text-[11px]">Cantidad de Cuotas</span>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <h3 className="font-semibold text-slate-800 text-xs">
                  Historial de Pagos ({contractPagos.length})
                </h3>
              </div>
              <button
                onClick={handleOpenAbonar}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Registrar Pago</span>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {contractPagos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-center text-slate-400">
                        No hay pagos adicionales registrados para este contrato.
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
    </div>
  );
};
