import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { CompanyProvider } from './context/CompanyContext';
import { LoginView } from './components/auth/LoginView';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { DashboardModule } from './components/dashboard/DashboardModule';
import { CobranzasModule } from './components/cobranzas/CobranzasModule';
import { VentasModule } from './components/ventas/VentasModule';
import { PlanoLotesModule } from './components/lotes/PlanoLotesModule';
import { CajaChicaModule } from './components/caja/CajaChicaModule';
import { AuditoriaModule } from './components/auditoria/AuditoriaModule';
import { UsuariosModule } from './components/usuarios/UsuariosModule';
import { ConfiguracionModule } from './components/configuracion/ConfiguracionModule';
import { RegistrarAbonoModal } from './components/cobranzas/RegistrarAbonoModal';
import { ContratoDetailModal } from './components/ventas/ContratoDetailModal';
import { VoucherModal } from './components/common/VoucherModal';
import { NuevoClienteModal } from './components/ventas/NuevoClienteModal';
import { NuevaVentaModal } from './components/ventas/NuevaVentaModal';
import { Toaster } from 'sonner';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { 
    selectedContractForPayment, 
    setSelectedContractForPayment,
    selectedContractDetail,
    setSelectedContractDetail,
    activeVoucher,
    setActiveVoucher,
    isNuevoClienteModalOpen,
    setIsNuevoClienteModalOpen,
    isNuevaVentaModalOpen,
    setIsNuevaVentaModalOpen
  } = useData();

  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-600">
          Cargando Ecosol ERP...
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Background Main Application Interface (Dimmed & softly blurred when not authenticated) */}
      <div className={`flex h-full w-full overflow-hidden transition-all duration-300 ${!isAuthenticated ? 'pointer-events-none select-none filter blur-[1.5px] opacity-80' : ''}`}>
        {/* Sidebar Navigation */}
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Topbar */}
          <Topbar />

          {/* Scrollable Module Workspace */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
            <div className="w-full max-w-[1720px] mx-auto pb-12 transition-all duration-300">
              {activeModule === 'dashboard' && <DashboardModule />}
              {activeModule === 'cobranzas' && <CobranzasModule />}
              {activeModule === 'ventas' && <VentasModule />}
              {activeModule === 'lotes' && <PlanoLotesModule />}
              {activeModule === 'caja' && <CajaChicaModule />}
              {activeModule === 'usuarios' && <UsuariosModule />}
              {activeModule === 'auditoria' && <AuditoriaModule />}
              {activeModule === 'configuracion' && <ConfiguracionModule />}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Login Modal Overlay when not authenticated */}
      {!isAuthenticated && <LoginView />}

      {/* Modals Portal (when authenticated) */}
      {isAuthenticated && (
        <>
          <RegistrarAbonoModal
            contract={selectedContractForPayment}
            onClose={() => setSelectedContractForPayment(null)}
          />

          <ContratoDetailModal
            contrato={selectedContractDetail}
            onClose={() => setSelectedContractDetail(null)}
          />

          <VoucherModal
            pago={activeVoucher}
            onClose={() => setActiveVoucher(null)}
          />

          <NuevoClienteModal
            isOpen={isNuevoClienteModalOpen}
            onClose={() => setIsNuevoClienteModalOpen(false)}
          />

          <NuevaVentaModal
            isOpen={isNuevaVentaModalOpen}
            onClose={() => setIsNuevaVentaModalOpen(false)}
          />
        </>
      )}
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <CompanyProvider>
        <AuthProvider>
          <DataProvider>
            <MainAppContent />
            <Toaster
              position="top-right"
              richColors
            />
          </DataProvider>
        </AuthProvider>
      </CompanyProvider>
    </ThemeProvider>
  );
}

export default App;
