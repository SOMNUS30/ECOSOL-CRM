import React, { useState } from 'react';
import { toast } from 'sonner';
import { useData } from '../../context/DataContext';
import { EstadoLote, ControlCobranza, Contrato } from '../../types/database';
import { 
  X, 
  AlertTriangle, 
  UserX, 
  Building2, 
  FileText, 
  CheckCircle2, 
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface DesistirClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Can receive either a ControlCobranza or a Contrato
  target: ControlCobranza | Contrato | null;
  onSuccess?: () => void;
}

export const DesistirClienteModal: React.FC<DesistirClienteModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess
}) => {
  const { desistirContrato, lotes = [] } = useData();
  const [nuevoEstadoLote, setNuevoEstadoLote] = useState<EstadoLote>('DISPONIBLE');
  const [motivo, setMotivo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !target) return null;

  // Normalize fields between ControlCobranza and Contrato
  const codigoContrato = target.codigo_contrato || '';
  const contratoId = 'contrato_id' in target ? target.contrato_id : target.id;
  
  // Client info
  const clienteNombre = 'propietario' in target 
    ? target.propietario 
    : (target.cliente?.nombres_apellidos || (target as any).clientes?.nombres_apellidos || 'Titular');
  const clienteDni = 'dni' in target 
    ? target.dni 
    : (target.cliente?.dni || (target as any).clientes?.dni || '');
  const clienteTelefono = 'telefono' in target 
    ? target.telefono 
    : (target.cliente?.telefono || (target as any).clientes?.telefono || '');

  // Lote info
  let etapa = 1;
  let manzana = '';
  let numeroLote = '';
  let loteId: number | string | undefined = undefined;

  if ('manzana' in target) {
    etapa = Number(target.etapa || 1);
    manzana = target.manzana || '';
    numeroLote = target.numero_lote || '';
    // Resolve loteId from lotes list
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
      toast.error('Error al identificar el expediente del contrato');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await desistirContrato(
        contratoId,
        loteId,
        nuevoEstadoLote,
        motivo.trim() || undefined
      );

      if (res.success) {
        toast.success(`Cliente ${clienteNombre} desistido con éxito`, {
          description: `El contrato ${codigoContrato} pasó a estado DESISTIDO y el lote fue actualizado a ${nuevoEstadoLote}.`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Error al desistir cliente', {
          description: res.error || 'No se pudo actualizar el registro en Supabase.'
        });
      }
    } catch (err: any) {
      toast.error('Error inesperado', {
        description: err?.message || 'Ocurrió un error al procesar el desistimiento.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Desistir Cliente / Contrato
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

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Info Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Cliente Titular:</span>
              <span className="font-bold text-slate-900 text-right truncate max-w-[240px]">
                {clienteNombre}
              </span>
            </div>
            {clienteDni && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">DNI:</span>
                <span className="font-mono text-slate-700">{clienteDni}</span>
              </div>
            )}
            {clienteTelefono && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Teléfono:</span>
                <span className="font-mono text-slate-700">{clienteTelefono}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Lote Asignado:
              </span>
              <span className="font-bold text-emerald-800">
                Etapa {etapa} • Mz {manzana || '-'} • Lt {numeroLote || '-'}
              </span>
            </div>
          </div>

          {/* Lote Disposition Option */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">
              Disposición del Lote tras el Desistimiento:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label 
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  nuevoEstadoLote === 'DISPONIBLE'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="estadoLote"
                      value="DISPONIBLE"
                      checked={nuevoEstadoLote === 'DISPONIBLE'}
                      onChange={() => setNuevoEstadoLote('DISPONIBLE')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-bold text-emerald-950 text-xs">Liberar Lote</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  El lote pasa a <b>DISPONIBLE</b> en el plano para poder venderse a otro cliente.
                </p>
              </label>

              <label 
                className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                  nuevoEstadoLote === 'DESISTIDO'
                    ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="estadoLote"
                    value="DESISTIDO"
                    checked={nuevoEstadoLote === 'DESISTIDO'}
                    onChange={() => setNuevoEstadoLote('DESISTIDO')}
                    className="text-slate-600 focus:ring-slate-500"
                  />
                  <span className="font-bold text-slate-800 text-xs">Mantener Desistido</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  El lote figurará como <b>DESISTIDO</b> en el plano y no estará en venta libre.
                </p>
              </label>
            </div>
          </div>

          {/* Motivo / Observaciones (opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo o Detalle del Desistimiento (opcional):
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Solicitud de anulación de compra por mutuo acuerdo, cambio de planes del comprador..."
              rows={2}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Operational Impact Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-950 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Consecuencias en el sistema:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1">
              <li>El contrato figurará con estado <b>DESISTIDO</b> en todo el CRM.</li>
              <li>En <b>Control de Cobranzas</b> se mostrará con la etiqueta <b>Desistido</b> y se desactivarán las alertas de mora.</li>
              <li>En los <b>reportes de cobranzas</b> se <b>excluirá automáticamente</b> por defecto para no distorsionar las cuentas activas.</li>
              <li>Podrás reactivar el contrato en cualquier momento si el cliente reanuda su compra.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <UserX className="w-4 h-4" />
            <span>{isSubmitting ? 'Procesando desistimiento...' : 'Confirmar Desistimiento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

