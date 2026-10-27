import React, { useState, useEffect } from 'react';
import { Lote, EstadoLote } from '../../types/database';
import { useData } from '../../context/DataContext';
import { toast } from 'sonner';
import { 
  Building2, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  DollarSign, 
  Maximize2, 
  MapPin, 
  Info 
} from 'lucide-react';

interface EditarLoteModalProps {
  lote: Lote | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditarLoteModal: React.FC<EditarLoteModalProps> = ({ lote, isOpen, onClose }) => {
  const { actualizarLote } = useData();

  const [precioLista, setPrecioLista] = useState<number>(0);
  const [areaM2, setAreaM2] = useState<number>(0);
  const [referencia, setReferencia] = useState<string>('ESTANDAR');
  const [estado, setEstado] = useState<string>('DISPONIBLE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lote) {
      setPrecioLista(Number(lote.precio_lista) || 0);
      setAreaM2(Number(lote.area_m2) || 0);
      setReferencia(lote.referencia || 'ESTANDAR');
      setEstado(lote.estado || 'DISPONIBLE');
    }
  }, [lote, isOpen]);

  if (!isOpen || !lote) return null;

  const isSold = lote.estado === 'VENDIDO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (precioLista <= 0) {
      toast.error('Precio no válido', { description: 'El precio debe ser un número positivo.' });
      return;
    }

    if (areaM2 <= 0) {
      toast.error('Metraje no válido', { description: 'El área en m² debe ser positiva.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const updates: Partial<Lote> = {
        precio_lista: Number(precioLista),
        area_m2: Number(areaM2),
        referencia: referencia.trim().toUpperCase(),
        // Only allow changing state if not sold
        ...(!isSold && { estado: estado as EstadoLote })
      };

      const res = await actualizarLote(lote.id, updates);

      if (res.success) {
        toast.success(`Lote Mz ${lote.manzana} Lt ${lote.numero_lote} actualizado`, {
          description: 'Los cambios se sincronizaron con Supabase y el inventario del CRM.'
        });
        onClose();
      } else {
        toast.error('Error al actualizar lote', {
          description: res.error || 'No se pudo guardar la modificación.'
        });
      }
    } catch (err: any) {
      toast.error('Error inesperado', { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const referenciasComunes = [
    'ESTANDAR',
    'FRENTE A PARQUE',
    'ESQUINA',
    'AVENIDA PRINCIPAL',
    'FRENTE A CLUB'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Editar Lote: Mz {lote.manzana} - Lt {lote.numero_lote}
              </h3>
              <p className="text-[11px] text-slate-500">
                Etapa {lote.etapa} • ID #{lote.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Status badge & notice */}
          {isSold ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lote Vendido con Contrato:</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  El estado está bloqueado en <b>VENDIDO</b> para proteger la cobranza. Puedes actualizar el precio de lista, metraje y referencia.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estado del Lote
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="DESISTIDO">DESISTIDO</option>
                <option value="RESERVADO">RESERVADO</option>
              </select>
            </div>
          )}

          {/* Precio Lista */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Precio de Lista (S/)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">S/</span>
              <input
                type="number"
                step="any"
                value={precioLista || ''}
                onChange={(e) => setPrecioLista(parseFloat(e.target.value) || 0)}
                placeholder="29320"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            {precioLista > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Equivalente: S/ {precioLista.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Metraje */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Metraje del Lote (m²)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={areaM2 || ''}
                onChange={(e) => setAreaM2(parseFloat(e.target.value) || 0)}
                placeholder="120"
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">m²</span>
            </div>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Referencia / Ubicación Especial
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="ESTANDAR, FRENTE A PARQUE, etc."
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {referenciasComunes.map((ref) => (
                <button
                  key={ref}
                  type="button"
                  onClick={() => setReferencia(ref)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                    referencia.toUpperCase() === ref
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
