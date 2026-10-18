import React, { createContext, useContext, useState, useEffect } from 'react';
import { EmpresaConfig } from '../types/database';
import { supabaseService } from '../services/supabase';

export const DEFAULT_EMPRESA_CONFIG: EmpresaConfig = {
  nombreEmpresa: 'ECOSOL INMOBILIARIA',
  razonSocial: 'ECOSOL INMOBILIARIA S.A.C.',
  ruc: '20608912341',
  direccion: 'Av. San Martín #450, Urb. San José',
  departamento: 'Ica',
  provincia: 'Ica',
  distrito: 'Ica',
  telefono: '952473876',
  email: 'administracion@ecosol.pe',
  logoUrl: '/ecosol-logo.png',
  representanteLegal: 'Lic. Roberto Mendoza Vargas',
  dniRepresentante: '45892134',
  bancoPrincipal: 'Banco de Crédito del Perú (BCP)',
  numeroCuenta: '193-9821384-0-12',
  cci: '002-19300982138401290',
  moneda: 'PEN',
  mensajeWhatsApp: 'Estimado(a) {cliente}, le saludamos de {empresa}. Le recordamos que su Cuota #{cuota} por un monto de S/ {monto} (Lote Mz {manzana} Lt {lote}, Contrato {contrato}) vence el {fecha}. Puede abonar vía BCP, Yape o Interbank. Agradecemos su puntualidad.',
  piePaginaVoucher: 'Comprobante digital del sistema ERP {empresa}. Válido como constancia de amortización y acreditación contable.'
};

const STORAGE_KEY = 'ecosol_empresa_config';

interface CompanyContextType {
  empresaConfig: EmpresaConfig;
  updateEmpresaConfig: (updates: Partial<EmpresaConfig>) => Promise<void>;
  resetEmpresaConfig: () => Promise<void>;
  buildWhatsAppMessage: (data: {
    cliente: string;
    cuota: number | string;
    monto: number | string;
    manzana: string;
    lote: string;
    contrato: string;
    fecha: string;
  }) => string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_EMPRESA_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Error reading empresa config from localStorage:', e);
    }
    return DEFAULT_EMPRESA_CONFIG;
  });

  // Pull live configuration from Supabase on mount
  useEffect(() => {
    supabaseService.getEmpresaConfig().then((cloudConfig) => {
      if (cloudConfig) {
        setEmpresaConfig(cloudConfig);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudConfig));
        } catch {}
      }
    });
  }, []);

  // Synchronize browser tab favicon and document title with company config
  useEffect(() => {
    // 1. Update Document Title
    if (empresaConfig.nombreEmpresa) {
      document.title = `${empresaConfig.nombreEmpresa} - ERP & Gestión de Cobranzas`;
    }

    // 2. Update Browser Tab Favicon dynamically
    if (empresaConfig.logoUrl) {
      try {
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(el => el.remove());

        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.type = empresaConfig.logoUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
        newLink.href = empresaConfig.logoUrl;
        document.head.appendChild(newLink);
      } catch (err) {
        console.warn('Error updating browser favicon:', err);
      }
    }
  }, [empresaConfig.logoUrl, empresaConfig.nombreEmpresa]);

  const updateEmpresaConfig = async (updates: Partial<EmpresaConfig>) => {
    const updated = { ...empresaConfig, ...updates };
    setEmpresaConfig(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving empresa config to localStorage:', e);
    }

    // Persist to Supabase in the cloud for all users
    await supabaseService.saveEmpresaConfig(updated);
  };

  const resetEmpresaConfig = async () => {
    setEmpresaConfig(DEFAULT_EMPRESA_CONFIG);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EMPRESA_CONFIG));
    } catch (e) {
      console.error('Error resetting empresa config in localStorage:', e);
    }
    await supabaseService.saveEmpresaConfig(DEFAULT_EMPRESA_CONFIG);
  };

  const buildWhatsAppMessage = (data: {
    cliente: string;
    cuota: number | string;
    monto: number | string;
    manzana: string;
    lote: string;
    contrato: string;
    fecha: string;
  }): string => {
    const template = empresaConfig.mensajeWhatsApp || DEFAULT_EMPRESA_CONFIG.mensajeWhatsApp;
    return template
      .replace(/{cliente}/g, data.cliente)
      .replace(/{empresa}/g, empresaConfig.nombreEmpresa)
      .replace(/{cuota}/g, String(data.cuota))
      .replace(/{monto}/g, String(data.monto))
      .replace(/{manzana}/g, data.manzana)
      .replace(/{lote}/g, data.lote)
      .replace(/{contrato}/g, data.contrato)
      .replace(/{fecha}/g, data.fecha);
  };

  return (
    <CompanyContext.Provider
      value={{
        empresaConfig,
        updateEmpresaConfig,
        resetEmpresaConfig,
        buildWhatsAppMessage
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
