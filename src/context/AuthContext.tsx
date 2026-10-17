import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { UsuarioAuth, RolUsuario } from '../types/database';

interface AuthContextType {
  user: UsuarioAuth | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginAsDemo: (rol?: RolUsuario) => void;
  switchRole: (rol: RolUsuario) => void;
  logout: () => Promise<void>;
  clearError: () => void;
  // RBAC permissions helpers
  canAccessFinanzas: boolean;
  canAccessUsuarios: boolean;
  canRegistrarPagos: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_PROFILES: Record<RolUsuario, UsuarioAuth> = {
  'Administrador': {
    id: 'usr-admin-01',
    email: 'admin.gerencia@ecosol.pe',
    nombres: 'Lic. Roberto Mendoza V.',
    rol: 'Administrador',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
  },
  'Cobranzas / Caja': {
    id: 'usr-cobranzas-02',
    email: 'sandra.morales@ecosol.pe',
    nombres: 'Sandra Morales Prado',
    rol: 'Cobranzas / Caja',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250'
  },
  'Asesor de Ventas': {
    id: 'usr-asesor-03',
    email: 'carlos.mendoza@ecosol.pe',
    nombres: 'Carlos Mendoza Torres',
    rol: 'Asesor de Ventas',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UsuarioAuth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check stored demo session
    const storedDemo = localStorage.getItem('ecosol_auth_demo');
    if (storedDemo) {
      try {
        setUser(JSON.parse(storedDemo));
        setLoading(false);
        return;
      } catch {
        // Continue
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'usuario@ecosol.pe',
          nombres: session.user.user_metadata?.nombres || session.user.email?.split('@')[0].toUpperCase() || 'Administrador',
          rol: (session.user.user_metadata?.rol as RolUsuario) || 'Administrador'
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || 'usuario@ecosol.pe',
          nombres: session.user.user_metadata?.nombres || session.user.email?.split('@')[0].toUpperCase() || 'Administrador',
          rol: (session.user.user_metadata?.rol as RolUsuario) || 'Administrador'
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    if (!email || !pass) {
      const err = 'Por favor complete todos los campos de correo y contraseña.';
      setError(err);
      return { success: false, error: err };
    }

    try {
      const { data, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (sbError) {
        const msg = sbError.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas. Compruebe el correo y la contraseña, o utilice el botón de ingreso rápido Demo.'
          : sbError.message;
        setError(msg);
        return { success: false, error: msg };
      }

      if (data.user) {
        const authUser: UsuarioAuth = {
          id: data.user.id,
          email: data.user.email || email,
          nombres: data.user.user_metadata?.nombres || email.split('@')[0].toUpperCase(),
          rol: (data.user.user_metadata?.rol as RolUsuario) || 'Administrador'
        };
        setUser(authUser);
        localStorage.removeItem('ecosol_auth_demo');
        return { success: true };
      }

      return { success: false, error: 'No se pudo iniciar sesión.' };
    } catch (err: any) {
      const msg = err.message || 'Error de conexión con el servicio de autenticación.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const loginAsDemo = (rol: RolUsuario = 'Administrador') => {
    setError(null);
    const profile = DEMO_PROFILES[rol] || DEMO_PROFILES['Administrador'];
    setUser(profile);
    localStorage.setItem('ecosol_auth_demo', JSON.stringify(profile));
  };

  const switchRole = (rol: RolUsuario) => {
    if (!user) return;
    const profile = DEMO_PROFILES[rol] || {
      ...user,
      rol
    };
    setUser(profile);
    localStorage.setItem('ecosol_auth_demo', JSON.stringify(profile));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    localStorage.removeItem('ecosol_auth_demo');
    setUser(null);
  };

  const clearError = () => setError(null);

  // RBAC Permissions calculations
  const canAccessFinanzas = user?.rol === 'Administrador' || user?.rol === 'Cobranzas / Caja';
  const canAccessUsuarios = user?.rol === 'Administrador';
  const canRegistrarPagos = user?.rol === 'Administrador' || user?.rol === 'Cobranzas / Caja';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        error,
        loginWithEmail,
        loginAsDemo,
        switchRole,
        logout,
        clearError,
        canAccessFinanzas,
        canAccessUsuarios,
        canRegistrarPagos
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
