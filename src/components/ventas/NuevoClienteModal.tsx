import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Cliente } from '../../types/database';
import { toast } from 'sonner';
import { 
  UserPlus, 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Check, 
  AlertCircle,
  CreditCard,
  Building2,
  Navigation
} from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';
import { 
  DEPARTAMENTOS_PERU, 
  getProvinciasByDepartamento, 
  getDistritosByProvincia 
} from '../../data/peruUbigeo';

interface NuevoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: (cliente: Cliente) => void;
}

export const NuevoClienteModal: React.FC<NuevoClienteModalProps> = ({ 
  isOpen, 
  onClose,
  onClientCreated 
}) => {
  const { registrarCliente } = useData();

  const [dni, setDni] = useState('');
  const [nombresApellidos, setNombresApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('Ica');
  const [provincia, setProvincia] = useState('Ica');
  const [distrito, setDistrito] = useState('Ica');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ubigeo Cascading Options
  const departamentosOptions = DEPARTAMENTOS_PERU;

  const provinciasOptions = useMemo(() => {
    return getProvinciasByDepartamento(departamento);
  }, [departamento]);

  const distritosOptions = useMemo(() => {
    return getDistritosByProvincia(departamento, provincia);
  }, [departamento, provincia]);

  const handleDepartamentoChange = (newDep: string) => {
    setDepartamento(newDep);
    const provs = getProvinciasByDepartamento(newDep);
    const firstProv = provs[0] || '';
    setProvincia(firstProv);
    const dists = getDistritosByProvincia(newDep, firstProv);
    setDistrito(dists[0] || '');
  };

  const handleProvinciaChange = (newProv: string) => {
    setProvincia(newProv);
    const dists = getDistritosByProvincia(departamento, newProv);
    setDistrito(dists[0] || '');
  };

  const handleDistritoChange = (newDist: string) => {
    setDistrito(newDist);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. DNI validation: exactly 8 digits
    const cleanDni = dni.trim().replace(/\D/g, '');
    if (cleanDni.length !== 8) {
      setErrorMsg('El DNI debe contener exactamente 8 dígitos numéricos.');
      return;
    }

    // 2. Nombres validation
    if (!nombresApellidos.trim()) {
      setErrorMsg('El nombre y apellido completo es obligatorio.');
      return;
    }

    // 3. Teléfono validation: exactly 9 digits
    const cleanPhone = telefono.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 9) {
      setErrorMsg('El teléfono debe tener 9 dígitos numéricos (ej: 987654321).');
      return;
    }

    // 4. Correo validation
    if (correo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo.trim())) {
        setErrorMsg('Por favor ingrese un correo electrónico válido.');
        return;
      }
    }

    // 5. Dirección validation
    if (!direccion.trim()) {
      setErrorMsg('La dirección domiciliaria es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient = await registrarCliente({
        dni: cleanDni,
        nombres_apellidos: nombresApellidos.trim().toUpperCase(),
        telefono: cleanPhone,
        correo: correo.trim().toLowerCase(),
        direccion: direccion.trim(),
        distrito: distrito.trim(),
        provincia: provincia.trim(),
        departamento: departamento.trim()
      });

      if (newClient) {
        toast.success('Cliente registrado exitosamente', {
          description: `${newClient.nombres_apellidos} (DNI ${newClient.dni}) añadido al padrón de Ecosol.`,
          duration: 4000
        });

        if (onClientCreated) {
          onClientCreated(newClient);
        }

        // Reset fields
        setDni('');
        setNombresApellidos('');
        setTelefono('');
        setCorreo('');
        setDireccion('');
        setDepartamento('Ica');
        setProvincia('Ica');
        setDistrito('Ica');

        onClose();
      } else {
        setErrorMsg('Ocurrió un error al registrar el cliente en el sistema.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al conectar con Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl p-5 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Registrar Nuevo Cliente
              </h2>
              <p className="text-[11px] text-slate-500">
                Incorporación al padrón de adquirentes en Supabase
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-3.5 text-xs pr-1 pb-16">
          {/* Row 1: DNI & Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                DNI Titular <span className="text-rose-500">* (8 dígitos)</span>
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 47891234"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Celular / WhatsApp <span className="text-rose-500">* (9 dígitos)</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  maxLength={9}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 956123456"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Nombres y Apellidos */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Nombres y Apellidos Completos <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={nombresApellidos}
                onChange={(e) => setNombresApellidos(e.target.value)}
                placeholder="Ej: Juan Carlos Pérez Quispe"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Row 3: Correo Electrónico */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Correo Electrónico <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cliente@gmail.com"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Row 4: Dirección */}
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Dirección Domiciliaria <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. San Martín #450, Urb. Luren"
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Ubicación Geográfica: Departamento -> Provincia -> Distrito en Cascada con Búsqueda */}
          <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ubicación Domiciliaria (Perú)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Cascada y búsqueda en tiempo real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Departamento */}
              <SearchableSelect
                label="Departamento"
                value={departamento}
                onChange={handleDepartamentoChange}
                options={departamentosOptions}
                placeholder="Ej: Ayacucho, Ica..."
                required
                icon={<Building2 className="w-3.5 h-3.5" />}
              />

              {/* 2. Provincia */}
              <SearchableSelect
                label="Provincia"
                value={provincia}
                onChange={handleProvinciaChange}
                options={provinciasOptions}
                placeholder={departamento ? 'Selecciona provincia...' : 'Elija dpto primero'}
                disabled={!departamento || provinciasOptions.length === 0}
                disabledMessage="Elija dpto primero"
                required
              />

              {/* 3. Distrito */}
              <SearchableSelect
                label="Distrito"
                value={distrito}
                onChange={handleDistritoChange}
                options={distritosOptions}
                placeholder={provincia ? 'Selecciona distrito...' : 'Elija prov primero'}
                disabled={!provincia || distritosOptions.length === 0}
                disabledMessage="Elija prov primero"
                required
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 mt-4">
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
              className="px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Cliente</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
