import React from 'react';
import { Pago } from '../../types/database';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';

interface VoucherModalProps {
  pago: Pago | null;
  onClose: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({ pago, onClose }) => {
  if (!pago) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-semibold text-xs text-slate-900">Comprobante de Pago</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher Body (Printable styling) */}
        <div className="p-5 space-y-4 text-slate-700">
          {/* Company & Voucher Identification */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 tracking-tight">ECOSOL INMOBILIARIA</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-mono font-medium">SAC</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">RUC: 20608912341 • Sede Ica</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-medium">
                OP: {pago.numero_operacion}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Fecha: {pago.fecha_pago}</p>
            </div>
          </div>

          {/* Amount Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Monto Acreditado
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              S/ {Number(pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-emerald-700 font-medium">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Operación validada en Supabase
            </span>
          </div>

          {/* Transaction Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 block text-[11px]">Contrato</span>
              <span className="text-slate-900 font-mono font-medium">{pago.codigo_contrato || 'CTR-GENERAL'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Tipo de Abono</span>
              <span className="text-slate-800 font-medium">{pago.tipo_pago}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Canal / Banco</span>
              <span className="text-slate-800 font-medium mt-0.5 block">{pago.metodo_pago}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">N° Operación</span>
              <span className="font-mono text-slate-800 font-medium">{pago.numero_operacion}</span>
            </div>
            {pago.propietario && (
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-400 block text-[11px]">Titular</span>
                <span className="text-slate-900 font-medium">{pago.propietario}</span>
              </div>
            )}
          </div>

          {/* Verification Note */}
          <div className="text-[10px] text-slate-400 text-center leading-normal">
            Comprobante digital del sistema ERP Ecosol Inmobiliaria. Sincronizado en tiempo real con la cuenta contable.
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
