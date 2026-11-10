import React, { useState } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { ControlCobranza, Contrato } from '../../types/database';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Building2, 
  AlertCircle 
} from 'lucide-react';

interface ReactivarClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ControlCobranza | Contrato | null;
  onSuccess?: () => void;
}

export const ReactivarClienteModal: React.FC<ReactivarClienteModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess
}) => {
  const { reactivarContrato, lotes = [] } = useData();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !target) return null;

  const codigoContrato = target.codigo_contrato || '';
  const contratoId = 'contrato_id' in target ? target.contrato_id : target.id;
  const clienteNombre = 'propietario' in target 
    ? target.propietario 
    : (target.cliente?.nombres_apellidos || (target as any).clientes?.nombres_apellidos || 'Titular');

  let etapa = 1;
  let manzana = '';
  let numeroLote = '';
  let loteId: number | string | undefined = undefined;

  if ('manzana' in target) {
    etapa = Number(target.etapa || 1);
    manzana = target.manzana || '';
    numeroLote = target.numero_lote || '';
    const foundLote = lotes.find(l => 
      Number(l.etapa) === etapa && 
      l.manzana?.toUpperCase().trim() === manzana.toUpperCase().trim() && 
      String(l.numero_lote).trim() === String(numeroLote).trim()
    );
    if (foundLote) loteId = foundLote.id;
  } else if ('lote' in target || 'lotes' in target) {
    const lObj = target.lote || (target as any).lotes;
    if (lObj) {
      etapa = Number(lObj.etapa || 1);
      manzana = lObj.manzana || '';
      numeroLote = lObj.numero_lote || '';
      loteId = lObj.id;
    }
  }

  const handleConfirm = async () => {
    if (!contratoId) {
      toast.error('Error al identificar el contrato');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reactivarContrato(contratoId, loteId);
      if (res.success) {
        toast.success(`Contrato ${codigoContrato} reactivado con éxito`, {
          description: `El cliente ${clienteNombre} vuelve a estar ACTIVO y el lote fue actualizado a VENDIDO.`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Error al reactivar contrato', {
          description: res.error || 'No se pudo reactivar el contrato en Supabase.'
        });
      }
    } catch (err: any) {
      toast.error('Error inesperado', {
        description: err?.message || 'Ocurrió un error al reactivar el contrato.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Reactivar Cliente / Contrato
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Expediente: {codigoContrato}
              </p>
            </div>
          </div>
          <button
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs">
          <p className="text-slate-600 leading-relaxed">
            ¿Está seguro de reactivar el contrato de <b>{clienteNombre}</b>?
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Contrato:</span>
              <span className="font-mono font-bold text-slate-900">{codigoContrato}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Lote:</span>
              <span className="font-bold text-emerald-800">Etapa {etapa} • Mz {manzana || '-'} • Lt {numeroLote || '-'}</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Acciones automáticas:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-blue-900/90 pl-1">
              <li>El contrato pasará a estado <b>ACTIVO</b>.</li>
              <li>El lote asignado se marcará como <b>VENDIDO</b>.</li>
              <li>El cliente volverá al control regular de cobranzas y cuotas.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Reactivando...' : 'Sí, Reactivar Contrato'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

