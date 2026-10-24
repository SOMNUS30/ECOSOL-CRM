import React, { useState, useRef } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { EmpresaConfig } from '../../types/database';
import { toast } from 'sonner';
import { 
  Building2, 
  Upload, 
  Link as LinkIcon, 
  RotateCcw, 
  Save, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  MessageSquare, 
  ShieldCheck, 
  Eye, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Receipt,
  Sparkles,
  Palette,
  Check
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

type ConfigTab = 'identidad' | 'fiscal' | 'contacto' | 'plantillas' | 'vistaPrevia' | 'apariencia';

export const ConfiguracionModule: React.FC = () => {
  const { empresaConfig, updateEmpresaConfig, resetEmpresaConfig, buildWhatsAppMessage } = useCompany();
  const { colorThemeId, setColorThemeId, colorThemes, activeColorTheme } = useTheme();

  // Local form state cloned from context
  const [formData, setFormData] = useState<EmpresaConfig>({ ...empresaConfig });
  const [activeTab, setActiveTab] = useState<ConfigTab>('identidad');
  const [isSaving, setIsSaving] = useState(false);
  const [logoInputType, setLogoInputType] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if context changes externally
  React.useEffect(() => {
    setFormData({ ...empresaConfig });
  }, [empresaConfig]);

  const handleChange = (field: keyof EmpresaConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Archivo no válido', {
        description: 'Por favor seleccione una imagen en formato PNG, JPG o WEBP.'
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagen demasiado pesada', {
        description: 'El tamaño máximo recomendado es de 2 MB para un óptimo rendimiento.'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/png');
          handleChange('logoUrl', base64);
        } else {
          handleChange('logoUrl', event.target?.result as string);
        }
        toast.success('Logotipo cargado', {
          description: 'Haga clic en "Guardar Cambios" para sincronizar en la nube para todos los usuarios.'
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrlLogo = () => {
    if (!urlInput.trim()) {
      toast.error('URL requerida', { description: 'Ingrese una dirección URL válida para la imagen.' });
      return;
    }
    handleChange('logoUrl', urlInput.trim());
    toast.success('URL de logo asignada');
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Quick validation
    if (!formData.nombreEmpresa.trim()) {
      toast.error('Campo requerido', { description: 'El nombre comercial de la empresa no puede estar vacío.' });
      setIsSaving(false);
      return;
    }

    if (formData.ruc.trim() && formData.ruc.trim().length !== 11) {
      toast.warning('Aviso sobre RUC', { description: 'El número de RUC en Perú generalmente contiene 11 dígitos.' });
    }

    try {
      await updateEmpresaConfig(formData);
      toast.success('Configuración guardada en la nube', {
        description: 'El nombre, logo y datos fiscales se han sincronizado en Supabase para todos los usuarios.',
        duration: 4000
      });
    } catch {
      toast.error('Error al sincronizar en la nube', {
        description: 'Se guardó en la memoria local.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (window.confirm('¿Está seguro de que desea restablecer los datos de la empresa a los valores por defecto?')) {
      await resetEmpresaConfig();
      toast.info('Valores restablecidos a configuración de fábrica.');
    }
  };

  // Sample WhatsApp preview message with current template
  const sampleWhatsAppPreview = React.useMemo(() => {
    return (formData.mensajeWhatsApp || '')
      .replace(/{cliente}/g, 'Juan Carlos Pérez Ramos')
      .replace(/{empresa}/g, formData.nombreEmpresa || 'ECOSOL INMOBILIARIA')
      .replace(/{cuota}/g, '12')
      .replace(/{monto}/g, '230.00')
      .replace(/{manzana}/g, 'F')
      .replace(/{lote}/g, '28')
      .replace(/{contrato}/g, 'CTR-0051')
      .replace(/{fecha}/g, new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, [formData.mensajeWhatsApp, formData.nombreEmpresa]);

  const insertVariable = (variable: string) => {
    handleChange('mensajeWhatsApp', (formData.mensajeWhatsApp || '') + ' ' + variable);
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Configuración de la Empresa
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalice logotipo, razón social, RUC, domicilios y plantillas de comprobantes
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            type="button"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            type="button"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('identidad')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'identidad'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Identidad & Logotipo</span>
        </button>

        <button
          onClick={() => setActiveTab('fiscal')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'fiscal'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Datos Fiscales & Legales</span>
        </button>

        <button
          onClick={() => setActiveTab('contacto')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'contacto'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Contacto & Bancos</span>
        </button>

        <button
          onClick={() => setActiveTab('plantillas')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'plantillas'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Plantillas WhatsApp & Voucher</span>
        </button>

        <button
          onClick={() => setActiveTab('vistaPrevia')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'vistaPrevia'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vista Previa en Vivo</span>
        </button>

        <button
          onClick={() => setActiveTab('apariencia')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'apariencia'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>Tema &amp; Colores</span>
        </button>
      </div>

      {/* TAB 1: IDENTIDAD & LOGOTIPO */}
      {activeTab === 'identidad' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Nombres Comerciales & Marca</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nombre Comercial de la Empresa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nombreEmpresa}
                    onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                    placeholder="Ej. ECOSOL INMOBILIARIA"
                    className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Se muestra en el menú lateral, encabezados y mensajes.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Razón Social Completa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.razonSocial}
                    onChange={(e) => handleChange('razonSocial', e.target.value)}
                    placeholder="Ej. ECOSOL INMOBILIARIA S.A.C."
                    className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Nombre legal utilizado en contratos y recibos de pago.</p>
                </div>
              </div>
            </div>

            {/* Logo Manager */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Logotipo de la Empresa</span>
                </h2>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setLogoInputType('upload')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      logoInputType === 'upload' ? 'bg-white shadow-xs font-semibold text-slate-800' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Subir archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoInputType('url')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      logoInputType === 'url' ? 'bg-white shadow-xs font-semibold text-slate-800' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Enlace URL
                  </button>
                </div>
              </div>

              {logoInputType === 'upload' ? (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/20 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">Haga clic para seleccionar imagen de su equipo</p>
                    <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, SVG o WEBP (Máx. 2MB). Ideal formato cuadrado o isotipo.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://ejemplo.com/mi-logo.png"
                      className="flex-1 px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleApplyUrlLogo}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
                    >
                      Aplicar URL
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Logo actual: <code className="text-slate-600 font-mono text-[10px]">{formData.logoUrl.slice(0, 45)}...</code>
                </span>
                <button
                  type="button"
                  onClick={() => handleChange('logoUrl', '/ecosol-logo.png')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                >
                  Restaurar logo original ECOSOL
                </button>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Preview Card */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Visualización de Marca
              </h3>

              {/* Logo in light box */}
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                <div className="w-20 h-20 mx-auto rounded-xl bg-white border border-slate-200 p-2 shadow-xs flex items-center justify-center overflow-hidden">
                  {formData.logoUrl ? (
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-emerald-600" />
                  )}
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-900">{formData.nombreEmpresa || 'Nombre Empresa'}</h4>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{formData.razonSocial || 'Razón Social'}</p>
                </div>
              </div>

              {/* Preview in Sidebar Context */}
              <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Cómo se ve en el Sidebar
                </span>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-center shrink-0">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="h-9 w-auto max-w-[42px] object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold tracking-tight text-slate-900 text-xs truncate">
                        {formData.nombreEmpresa.split(' ')[0] || 'ECOSOL'}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                        ERP
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase truncate">
                      {formData.nombreEmpresa.split(' ').slice(1).join(' ') || 'INMOBILIARIA'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATOS FISCALES & LEGALES */}
      {activeTab === 'fiscal' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Datos Tributarios y Ubicación Fiscal</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Número de RUC (SUNAT) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={11}
                value={formData.ruc}
                onChange={(e) => handleChange('ruc', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="20608912341"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">11 dígitos numéricos.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dirección Fiscal / Sede Central <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.direccion}
                onChange={(e) => handleChange('direccion', e.target.value)}
                placeholder="Av. San Martín #450, Urb. San José"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Departamento
              </label>
              <input
                type="text"
                value={formData.departamento}
                onChange={(e) => handleChange('departamento', e.target.value)}
                placeholder="Ica"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Provincia
              </label>
              <input
                type="text"
                value={formData.provincia}
                onChange={(e) => handleChange('provincia', e.target.value)}
                placeholder="Ica"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Distrito
              </label>
              <input
                type="text"
                value={formData.distrito}
                onChange={(e) => handleChange('distrito', e.target.value)}
                placeholder="Ica"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-4 border-t border-slate-100">
            Representación Legal
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nombres y Apellidos del Representante Legal
              </label>
              <input
                type="text"
                value={formData.representanteLegal}
                onChange={(e) => handleChange('representanteLegal', e.target.value)}
                placeholder="Lic. Roberto Mendoza Vargas"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">Gerente General o Apoderado Legal.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                DNI / Documento de Identidad
              </label>
              <input
                type="text"
                maxLength={8}
                value={formData.dniRepresentante}
                onChange={(e) => handleChange('dniRepresentante', e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="45892134"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACTO & BANCOS */}
      {activeTab === 'contacto' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span>Canales Oficiales de Atención y Cobranzas</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono / WhatsApp de Cobranzas <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">+51</span>
                <input
                  type="text"
                  maxLength={9}
                  value={formData.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="952473876"
                  className="w-full pl-11 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Número donde los adquirentes envían sus comprobantes.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Correo Electrónico Institucional
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="administracion@ecosol.pe"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-4 border-t border-slate-100">
            Cuentas Bancarias de Recaudación
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Banco Recaudador Principal
              </label>
              <input
                type="text"
                value={formData.bancoPrincipal}
                onChange={(e) => handleChange('bancoPrincipal', e.target.value)}
                placeholder="Banco de Crédito del Perú (BCP)"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Número de Cuenta Corriente
              </label>
              <input
                type="text"
                value={formData.numeroCuenta}
                onChange={(e) => handleChange('numeroCuenta', e.target.value)}
                placeholder="193-9821384-0-12"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Código de Cuenta Interbancario (CCI)
              </label>
              <input
                type="text"
                value={formData.cci}
                onChange={(e) => handleChange('cci', e.target.value)}
                placeholder="002-19300982138401290"
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLANTILLAS WHATSAPP & VOUCHER */}
      {activeTab === 'plantillas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Template Editor */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>Plantilla de Recordatorio por WhatsApp</span>
            </h2>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Texto del mensaje automático
                </label>
                <span className="text-[11px] text-slate-400">Haga clic en una variable para insertarla:</span>
              </div>

              {/* Dynamic Variables Pill Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {[
                  '{cliente}',
                  '{empresa}',
                  '{cuota}',
                  '{monto}',
                  '{manzana}',
                  '{lote}',
                  '{contrato}',
                  '{fecha}'
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-medium transition-colors cursor-pointer"
                  >
                    + {v}
                  </button>
                ))}
              </div>

              <textarea
                rows={5}
                value={formData.mensajeWhatsApp}
                onChange={(e) => handleChange('mensajeWhatsApp', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors leading-relaxed"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pie de Página Institucional para Vouchers y Recibos
              </label>
              <input
                type="text"
                value={formData.piePaginaVoucher}
                onChange={(e) => handleChange('piePaginaVoucher', e.target.value)}
                placeholder="Comprobante digital del sistema ERP {empresa}..."
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">Impreso al final del ticket / voucher digital.</p>
            </div>
          </div>

          {/* Right: Simulated WhatsApp Chat Bubble */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulador de Envío WhatsApp</span>
              </h3>
              <span className="text-[10px] text-slate-400">Vista previa del cliente</span>
            </div>

            {/* Simulated Chat Phone Screen */}
            <div className="bg-[#e5ddd5] rounded-xl p-4 border border-slate-300 min-h-[220px] flex flex-col justify-end relative shadow-inner">
              {/* WhatsApp message bubble */}
              <div className="bg-[#dcf8c6] text-slate-900 text-xs p-3 rounded-lg shadow-xs max-w-sm ml-auto relative border border-[#c4eab0]">
                <p className="whitespace-pre-line leading-relaxed">{sampleWhatsAppPreview}</p>
                <div className="text-[10px] text-slate-500 text-right mt-1 flex items-center justify-end gap-1">
                  <span>10:45 a.m.</span>
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 italic text-center">
              Este mensaje se enviará automáticamente al hacer clic en el botón de WhatsApp desde la tabla de Cobranzas.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: VISTA PREVIA EN VIVO */}
      {activeTab === 'vistaPrevia' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Simulación de Comprobante / Recibo Oficial con Datos Actualizados</span>
            </h2>

            {/* Voucher Mockup */}
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 p-1 flex items-center justify-center shrink-0">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {formData.razonSocial || 'EMPRESA INMOBILIARIA S.A.C.'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      RUC: <b className="font-mono">{formData.ruc || '20000000001'}</b>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formData.direccion}, {formData.distrito} - {formData.departamento}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Monto Acreditado
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-0.5">
                  S/ 230.00
                </div>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200 mt-1">
                  Abono Registrado
                </span>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-100 py-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Titular:</span>
                  <span className="font-semibold text-slate-800">JUAN CARLOS PÉREZ</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Contrato:</span>
                  <span className="font-mono font-semibold text-slate-800">CTR-0051</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Lote:</span>
                  <span className="text-slate-800">Mz F • Lt 28</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Banco:</span>
                  <span className="text-slate-800">{formData.bancoPrincipal}</span>
                </div>
              </div>

              {/* Footer text */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {formData.piePaginaVoucher.replace(/{empresa}/g, formData.nombreEmpresa)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: APARIENCIA & COLORES DE LA INTERFAZ */}
      {activeTab === 'apariencia' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-600" />
                  <span>Personalización del Color de la Interfaz</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Elija una paleta cromática ejecutiva y elegante. Todos los botones, estados, gráficos y menús del CRM se adaptarán en tiempo real sin recargar la página.
                </p>
              </div>

              {/* Active Theme Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs shrink-0 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Tema en uso: <b>{activeColorTheme.name}</b></span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Themes Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Paletas Elegantes &amp; Empresariales
                </h3>
                <span className="text-[11px] text-slate-400">
                  {colorThemes.length} opciones disponibles
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {colorThemes.map((thm) => {
                  const isSelected = colorThemeId === thm.id;

                  return (
                    <div
                      key={thm.id}
                      onClick={() => {
                        setColorThemeId(thm.id);
                        toast.success(`Tema aplicado: ${thm.name}`, {
                          description: 'La interfaz se ha actualizado con la nueva paleta corporativa.',
                          duration: 3000
                        });
                      }}
                      className={`relative bg-white border rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/15'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Header: Name and Active badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                              {thm.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                              {thm.name}
                            </h4>
                          </div>

                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                          {thm.description}
                        </p>
                      </div>

                      <div>
                        {/* Color Swatches */}
                        <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-medium text-slate-400 mr-1">Tonos:</span>
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: thm.palette[50] }}
                            title="Fondo suave (50)"
                          />
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: thm.palette[200] }}
                            title="Borde tenue (200)"
                          />
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: thm.palette[400] }}
                            title="Acento medio (400)"
                          />
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: thm.palette[600] }}
                            title="Primario corporativo (600)"
                          />
                          <div
                            className="w-5 h-5 rounded-md border border-slate-200 shadow-2xs"
                            style={{ backgroundColor: thm.palette[800] }}
                            title="Sólido / Texto oscuro (800)"
                          />
                        </div>

                        {/* Apply button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorThemeId(thm.id);
                            toast.success(`Tema aplicado: ${thm.name}`, { duration: 3000 });
                          }}
                          className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Tema Actualmente en Uso</span>
                            </>
                          ) : (
                            <span>Aplicar Este Tema</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 1 Col: Live Interactive Preview */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Simulación en Tiempo Real
              </h3>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4 sticky top-20">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Vista de Componentes</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                    En vivo
                  </span>
                </div>

                {/* Simulated Header Brand */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-900">{formData.nombreEmpresa.split(' ')[0] || 'ECOSOL'}</span>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                          ERP
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">INMOBILIARIA</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Buttons */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Botones de Acción Primaria
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      + Registrar Venta
                    </button>
                    <button
                      type="button"
                      className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      Exportar
                    </button>
                  </div>
                </div>

                {/* Simulated Metric Card */}
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Recaudación Mensual</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    S/ 148,500.00
                  </div>
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full transition-all duration-300 w-[78%]" />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Meta mensual</span>
                      <span className="font-semibold text-emerald-700">78% alcanzado</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Status Badges */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Etiquetas &amp; Estados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge-al-dia px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Al Día
                    </span>
                    <span className="badge-liquidado px-2 py-0.5 rounded text-[11px] font-medium inline-flex items-center gap-1">
                      Liquidado
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Lote Disponible
                    </span>
                  </div>
                </div>

                {/* Reset to Default Button */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setColorThemeId('verde-corporativo');
                      toast.info('Restablecido a Verde Corporativo (Por defecto)');
                    }}
                    className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Restablecer a Verde Corporativo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
