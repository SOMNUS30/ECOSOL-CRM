import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Cliente, Lote, FormaCompra, MetodoPago } from '../../types/database';
import { NuevoClienteModal } from './NuevoClienteModal';
import { toast } from 'sonner';
import { 
  FilePlus, 
  X, 
  Search, 
  UserPlus, 
  Building2, 
  CreditCard, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Wallet,
  Smartphone,
  Building,
  Check
} from 'lucide-react';

interface NuevaVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedLotId?: number | string;
}

export const NuevaVentaModal: React.FC<NuevaVentaModalProps> = ({
  isOpen,
  onClose,
  preselectedLotId
}) => {
  const { 
    clientes, 
    lotes, 
    registrarVenta, 
    getNextContractCode 
  } = useData();
  const { user } = useAuth();

  // Sub-modal for creating a client on the fly
  const [isSubModalClienteOpen, setIsSubModalClienteOpen] = useState(false);

  // Form states
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [asesor, setAsesor] = useState<string>('Carlos Mendoza Torres');
  const [fechaContrato, setFechaContrato] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [mesContrato, setMesContrato] = useState<string>(() => {
    const d = new Date();
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [formaCompra, setFormaCompra] = useState<FormaCompra>('CREDITO');

  const [precioVenta, setPrecioVenta] = useState<string>('12000');
  const [montoInicial, setMontoInicial] = useState<string>('1000');
  const [cantidadCuotas, setCantidadCuotas] = useState<number>(60);
  const [fechaPrimerPago, setFechaPrimerPago] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [metodoPago, setMetodoPago] = useState<MetodoPago>('BCP');
  const [numeroOperacion, setNumeroOperacion] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available lots (strictly DISPONIBLE)
  const availableLotes = useMemo(() => {
    return lotes.filter(l => l.estado === 'DISPONIBLE');
  }, [lotes]);

  // Selected lot object
  const selectedLote = useMemo(() => {
    return lotes.find(l => String(l.id) === String(selectedLoteId));
  }, [lotes, selectedLoteId]);

  // Filtered clients for quick search
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clientes.slice(0, 10);
    const q = clientSearchTerm.toLowerCase();
    return clientes.filter(c => 
      c.nombres_apellidos.toLowerCase().includes(q) || 
      c.dni.includes(q)
    ).slice(0, 10);
  }, [clientes, clientSearchTerm]);

  // Auto-generate next contract code
  const nextContractCode = useMemo(() => {
    return getNextContractCode();
  }, [getNextContractCode, isOpen]);

  // Handle preselected lot or default lot selection
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setNumeroOperacion(`OP-${Math.floor(100000 + Math.random() * 900000)}`);
      
      if (user?.nombres) {
        setAsesor(user.nombres);
      }

      if (preselectedLotId) {
        setSelectedLoteId(String(preselectedLotId));
        const found = lotes.find(l => String(l.id) === String(preselectedLotId));
        if (found) {
          setPrecioVenta(String(found.precio_lista || 12000));
        }
      } else if (availableLotes.length > 0 && !selectedLoteId) {
        setSelectedLoteId(String(availableLotes[0].id));
        setPrecioVenta(String(availableLotes[0].precio_lista || 12000));
      }
    }
  }, [isOpen, preselectedLotId, availableLotes, lotes, user]);

  // When lot selection changes, update default price
  const handleLoteChange = (loteId: string) => {
    setSelectedLoteId(loteId);
    const found = lotes.find(l => String(l.id) === String(loteId));
    if (found) {
      setPrecioVenta(String(found.precio_lista || 12000));
    }
  };

  // Calculations for Credit & Cash
  const isContado = formaCompra === 'CONTADO';
  const parsedPrecio = parseFloat(precioVenta) || 0;
  const parsedInicial = isContado ? parsedPrecio : (parseFloat(montoInicial) || 0);
  const saldoFinanciar = isContado ? 0 : Math.max(0, parsedPrecio - parsedInicial);
  const montoCuota = isContado || cantidadCuotas === 0 ? 0 : Math.round((saldoFinanciar / cantidadCuotas) * 100) / 100;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Validations
    if (!selectedCliente) {
      setErrorMsg('Debe seleccionar o registrar un cliente titular para el contrato.');
      return;
    }

    if (!selectedLote) {
      setErrorMsg('Debe seleccionar un lote disponible.');
      return;
    }

    if (parsedPrecio <= 0) {
      setErrorMsg('El precio de venta debe ser mayor a S/ 0.');
      return;
    }

    if (!isContado) {
      if (parsedInicial >= parsedPrecio) {
        setErrorMsg('En ventas a crédito, el monto inicial debe ser menor al precio de venta.');
        return;
      }
      if (cantidadCuotas <= 0) {
        setErrorMsg('Debe indicar un número de cuotas válido mayor a 0.');
        return;
      }
    }

    if (!numeroOperacion.trim()) {
      setErrorMsg('El número de operación bancaria es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await registrarVenta({
        cliente: selectedCliente,
        lote: selectedLote,
        asesor: asesor.trim(),
        fecha_contrato: fechaContrato,
        mes_contrato: mesContrato.trim().toUpperCase(),
        forma_compra: formaCompra,
        precio_venta: parsedPrecio,
        monto_inicial: parsedInicial,
        saldo_financiar: saldoFinanciar,
        cantidad_cuotas: isContado ? 0 : cantidadCuotas,
        monto_cuota: montoCuota,
        fecha_primer_pago: isContado ? fechaContrato : fechaPrimerPago,
        codigo_contrato: nextContractCode,
        metodo_pago: metodoPago,
        numero_operacion: numeroOperacion.trim().toUpperCase()
      });

      if (ok) {
        toast.success(`¡Venta y Contrato ${nextContractCode} registrados!`, {
          description: `Titular: ${selectedCliente.nombres_apellidos} • Lote: Mz ${selectedLote.manzana} Lt ${selectedLote.numero_lote} marcado como VENDIDO.`,
          duration: 5000
        });

        // Reset
        setSelectedCliente(null);
        setClientSearchTerm('');
        onClose();
      } else {
        setErrorMsg('Ocurrió un error al registrar la venta en Supabase.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al emitir el contrato.');
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
        <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-2xl p-5 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
                <FilePlus className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Registrar Nueva Venta / Contrato
                  </h2>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {nextContractCode}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Emisión de contrato inmobiliario y actualización de lotes en Supabase
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
            {/* 1. SELECCIÓN DE CLIENTE */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>1. Cliente Titular del Contrato</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsSubModalClienteOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-white border border-emerald-300 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Nuevo Cliente</span>
                </button>
              </div>

              {selectedCliente ? (
                /* Selected Client Pill */
                <div className="p-2.5 rounded-md bg-white border border-emerald-300 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 text-xs block">
                      {selectedCliente.nombres_apellidos}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      DNI: <b>{selectedCliente.dni}</b> • Cel: {selectedCliente.telefono} • {selectedCliente.distrito || 'Ica'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCliente(null);
                      setClientSearchTerm('');
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                /* Client Search Bar with Dropdown */
                <div className="relative">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onFocus={() => setShowClientDropdown(true)}
                      onChange={(e) => {
                        setClientSearchTerm(e.target.value);
                        setShowClientDropdown(true);
                      }}
                      placeholder="Buscar por DNI o Nombres del cliente..."
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {showClientDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredClients.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 text-xs">
                          <p>No se encontraron clientes coincidentes.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowClientDropdown(false);
                              setIsSubModalClienteOpen(true);
                            }}
                            className="mt-1 text-emerald-600 font-semibold hover:underline"
                          >
                            + Registrar nuevo cliente ahora
                          </button>
                        </div>
                      ) : (
                        filteredClients.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedCliente(c);
                              setShowClientDropdown(false);
                            }}
                            className="p-2.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                          >
                            <div>
                              <span className="font-medium text-slate-800 block">
                                {c.nombres_apellidos}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                DNI: {c.dni} • Cel: {c.telefono}
                              </span>
                            </div>
                            <span className="text-[11px] text-emerald-600 font-medium">
                              Seleccionar
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. SELECCIÓN DE LOTE DISPONIBLE */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>2. Lote del Proyecto (Únicamente Disponibles)</span>
                </label>
                <span className="text-[11px] text-emerald-700 font-medium">
                  {availableLotes.length} lotes disponibles
                </span>
              </div>

              {availableLotes.length === 0 ? (
                <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  No hay lotes con estado 'DISPONIBLE' actualmente en el inventario.
                </div>
              ) : (
                <select
                  value={selectedLoteId}
                  onChange={(e) => handleLoteChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                >
                  <option value="">Seleccione un lote...</option>
                  {availableLotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      Etapa {l.etapa} • Manzana {l.manzana} - Lote {l.numero_lote} — Precio Lista: S/ {Number(l.precio_lista).toLocaleString()} ({l.area_m2} m²)
                    </option>
                  ))}
                </select>
              )}

              {selectedLote && (
                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                  <span>Área: <b>{selectedLote.area_m2} m²</b></span>
                  <span>•</span>
                  <span>Zonificación: <b>Residencial R-2</b></span>
                  <span>•</span>
                  <span>Precio de Lista: <b className="text-emerald-600">S/ {Number(selectedLote.precio_lista).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</b></span>
                </div>
              )}
            </div>

            {/* 3. DATOS DE LA VENTA: ASESOR Y FECHAS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Asesor de Ventas
                </label>
                <input
                  type="text"
                  value={asesor}
                  onChange={(e) => setAsesor(e.target.value)}
                  placeholder="Nombre del asesor"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Fecha de Contrato
                </label>
                <input
                  type="date"
                  value={fechaContrato}
                  onChange={(e) => setFechaContrato(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Mes / Periodo
                </label>
                <input
                  type="text"
                  value={mesContrato}
                  onChange={(e) => setMesContrato(e.target.value)}
                  placeholder="OCTUBRE 2026"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* 4. MODALIDAD DE COMPRA (TOGGLE TABS) */}
            <div className="space-y-3">
              <label className="block text-[11px] font-medium text-slate-700">
                Modalidad de Compra
              </label>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormaCompra('CREDITO')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formaCompra === 'CREDITO'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Venta a Crédito (Cuotas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormaCompra('CONTADO')}
                  className={`py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    formaCompra === 'CONTADO'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Venta al Contado (Liquidado)</span>
                </button>
              </div>

              {/* FINANCIAL INPUTS ACCORDING TO MODALITY */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                {/* Precio de Venta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Precio de Venta Pactado (S/.) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-xs">
                        S/
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="100"
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      {isContado ? 'Monto Abonado al Contado' : 'Cuota Inicial / Abono (S/.)'}
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold text-xs">
                        S/
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isContado}
                        value={isContado ? precioVenta : montoInicial}
                        onChange={(e) => setMontoInicial(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:bg-slate-100"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Conditional Credit Fields */}
                {!isContado ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Cantidad de Cuotas
                      </label>
                      <select
                        value={cantidadCuotas}
                        onChange={(e) => setCantidadCuotas(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value={12}>12 meses (1 año)</option>
                        <option value={24}>24 meses (2 años)</option>
                        <option value={36}>36 meses (3 años)</option>
                        <option value={48}>48 meses (4 años)</option>
                        <option value={60}>60 meses (5 años)</option>
                        <option value={72}>72 meses (6 años)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Saldo a Financiar
                      </label>
                      <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs">
                        S/ {saldoFinanciar.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Cuota Mensual Estimada
                      </label>
                      <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-700 text-xs">
                        S/ {montoCuota.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                        Fecha de Primer Vencimiento (Cuota #1)
                      </label>
                      <input
                        type="date"
                        value={fechaPrimerPago}
                        onChange={(e) => setFechaPrimerPago(e.target.value)}
                        className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-[11px] text-blue-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">Venta al Contado 100% Amortizada</span>
                      <span>El saldo quedará en S/ 0.00 con 0 cuotas pendientes y estado <b>LIQUIDADO</b>.</span>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  </div>
                )}

                {/* 5. MEDIO DE PAGO & VOUCHER INICIAL */}
                <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Canal y Operación Bancaria ({isContado ? 'Pago Total Contado' : 'Abono de Cuota Inicial'})
                  </label>

                  <div className="grid grid-cols-5 gap-1.5">
                    {(['BCP', 'YAPE', 'INTERBANK', 'BANBIF', 'EFECTIVO'] as MetodoPago[]).map((metodo) => (
                      <button
                        key={metodo}
                        type="button"
                        onClick={() => setMetodoPago(metodo)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 border cursor-pointer ${
                          metodoPago === metodo
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {getMethodIcon(metodo)}
                        <span className="text-[10px]">{metodo}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      N° de Operación Bancaria / Referencia
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={numeroOperacion}
                        onChange={(e) => setNumeroOperacion(e.target.value)}
                        placeholder="Ej: OP-984210"
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 mt-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar y Emitir Contrato</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modal to create a client on the fly */}
      <NuevoClienteModal
        isOpen={isSubModalClienteOpen}
        onClose={() => setIsSubModalClienteOpen(false)}
        onClientCreated={(newClient) => {
          setSelectedCliente(newClient);
          setClientSearchTerm(newClient.nombres_apellidos);
        }}
      />
    </>
  );
};
