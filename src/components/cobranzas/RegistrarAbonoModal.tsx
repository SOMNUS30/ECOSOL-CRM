import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { ControlCobranza, TipoPago, MetodoPago } from '../../types/database';
import { toast } from 'sonner';
import { 
  X, 
  CreditCard, 
  Calendar, 
  Hash, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Smartphone,
  Wallet
} from 'lucide-react';

interface RegistrarAbonoModalProps {
  contract: ControlCobranza | null;
  onClose: () => void;
}

export const RegistrarAbonoModal: React.FC<RegistrarAbonoModalProps> = ({ contract, onClose }) => {
  const { registrarAbono } = useData();

  const [tipoPago, setTipoPago] = useState<TipoPago>('CUOTA');
  const [monto, setMonto] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('BCP');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-load default values when contract opens
  useEffect(() => {
    if (contract) {
      setMonto(String(contract.monto_cuota || ''));
      setTipoPago('CUOTA');
      setNumeroOperacion(`OP-${Math.floor(100000 + Math.random() * 900000)}`);
      setErrorMsg(null);
    }
  }, [contract]);

  if (!contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorMsg('Por favor ingrese un monto válido mayor a S/ 0.');
      return;
    }

    if (!numeroOperacion.trim()) {
      setErrorMsg('El número de operación bancaria es obligatorio.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ok = await registrarAbono({
        contrato_id: contract.codigo_contrato,
        tipo_pago: tipoPago,
        monto: parsedMonto,
        numero_operacion: numeroOperacion.trim().toUpperCase(),
        metodo_pago: metodoPago,
        fecha_pago: fechaPago,
        codigo_contrato: contract.codigo_contrato,
        propietario: contract.propietario
      });

      if (ok) {
        toast.success(`Abono registrado con éxito`, {
          description: `Cuota acreditada para ${contract.codigo_contrato} (${contract.propietario}). Los saldos se han actualizado.`,
          duration: 4000,
        });
        onClose();
      } else {
        setErrorMsg('Ocurrió un error al registrar el abono.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al guardar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMethodIcon = (m: MetodoPago) => {
    switch (m) {
      case 'YAPE': return <Smartphone className="w-3.5 h-3.5 text-purple-600" />;
      case 'BCP': return <Building className="w-3.5 h-3.5 text-blue-600" />;
      case 'INTERBANK': return <Building className="w-3.5 h-3.5 text-emerald-600" />;
      case 'BANBIF': return <Building className="w-3.5 h-3.5 text-cyan-600" />;
      case 'EFECTIVO': return <Wallet className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Registrar Pago de Cuota #{contract.proximo_numero_cuota || (contract.cuotas_pagadas + 1)}
              </h2>
              <p className="text-xs text-slate-500">
                Contrato: <span className="font-mono font-medium text-slate-700">{contract.codigo_contrato}</span>
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Read-Only Client & Contract Dossier */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Propietario</span>
              <span className="text-slate-900 font-semibold truncate block mt-0.5">
                {contract.propietario}
              </span>
              <span className="text-slate-500 text-[11px]">DNI: {contract.dni}</span>
            </div>

            <div>
              <span className="text-slate-500 block text-[11px]">Lote</span>
              <span className="text-slate-800 font-semibold block mt-0.5">
                Etapa {contract.etapa} • Mz {contract.manzana} • Lt {contract.numero_lote}
              </span>
              <span className="text-slate-500 text-[11px]">
                Cuota regular: <b className="text-slate-700">S/ {contract.monto_cuota}</b>
              </span>
            </div>

            <div className="col-span-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-slate-500">Avance: </span>
                <span className="text-emerald-700 font-medium">
                  {contract.cuotas_pagadas} de {contract.total_cuotas} cuotas
                </span>
              </div>
              <div>
                <span className="text-slate-500">Saldo Restante: </span>
                <span className="text-slate-900 font-medium">
                  S/ {Number(contract.saldo_restante).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Tipo de Pago */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Tipo de Pago
              </label>
              <select
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value as TipoPago)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="CUOTA">Cuota mensual regular</option>
                <option value="AMORTIZACION">Amortización extraordinaria</option>
                <option value="INICIAL">Cuota inicial</option>
                <option value="SEPARACION">Separación de lote</option>
              </select>
            </div>

            {/* Monto */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Monto del Abono (S/)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium text-xs">
                  S/
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Medio de Pago */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Medio de Pago Bancario
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['BCP', 'YAPE', 'INTERBANK', 'BANBIF', 'EFECTIVO'] as MetodoPago[]).map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setMetodoPago(metodo)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border cursor-pointer ${
                      metodoPago === metodo
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {getMethodIcon(metodo)}
                    <span className="text-[11px]">{metodo}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Número de Operación */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                N° Operación Bancaria
              </label>
              <div className="relative">
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  placeholder="Ej: OP-984321"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Fecha de Pago */}
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Fecha del Abono
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Acreditar Pago</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
