import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { UsuarioAuth, RolUsuario } from '../types/database';
import { initialUsuarios } from '../services/seedData';

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
      // 1. Try Supabase Auth
      try {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass
        });

        if (!sbError && data?.user) {
          const authUser: UsuarioAuth = {
            id: data.user.id,
            email: data.user.email || email,
            nombres: data.user.user_metadata?.nombres || email.split('@')[0].toUpperCase(),
            rol: (data.user.user_metadata?.rol as RolUsuario) || 'Administrador',
            avatar: data.user.user_metadata?.avatar
          };
          setUser(authUser);
          localStorage.removeItem('ecosol_auth_demo');
          return { success: true };
        }
      } catch (authErr) {
        console.warn('Supabase Auth error, trying database usuarios table:', authErr);
      }

      // 2. Query Supabase table 'usuarios' (for team members created in CRM)
      try {
        const { data: dbUser } = await supabase
          .from('usuarios')
          .select('*')
          .ilike('email', email.trim())
          .maybeSingle();

        if (dbUser) {
          if (dbUser.estado === 'Inactivo') {
            const err = 'La cuenta de este colaborador está inactiva. Comuníquese con administración.';
            setError(err);
            return { success: false, error: err };
          }

          const expectedPass = dbUser.password || '123456';
          if (expectedPass === pass) {
            const authUser: UsuarioAuth = {
              id: dbUser.id,
              email: dbUser.email,
              nombres: dbUser.nombre,
              rol: dbUser.rol as RolUsuario,
              avatar: dbUser.avatar || undefined
            };
            setUser(authUser);
            localStorage.setItem('ecosol_auth_demo', JSON.stringify(authUser));
            return { success: true };
          } else {
            const err = 'Contraseña incorrecta. Por favor intente nuevamente.';
            setError(err);
            return { success: false, error: err };
          }
        }
      } catch (dbErr) {
        console.warn('Error querying public.usuarios in Supabase:', dbErr);
      }

      // 3. Fallback to cached usuarios in localStorage
      const cached = localStorage.getItem('ecosol_usuarios_cache');
      if (cached) {
        try {
          const list: any[] = JSON.parse(cached);
          const found = list.find((u: any) => u.email?.toLowerCase() === email.trim().toLowerCase());
          if (found) {
            if (found.estado === 'Inactivo') {
              const err = 'La cuenta de este colaborador está inactiva.';
              setError(err);
              return { success: false, error: err };
            }
            const expected = found.password || '123456';
            if (expected === pass) {
              const authUser: UsuarioAuth = {
                id: found.id,
                email: found.email,
                nombres: found.nombre,
                rol: found.rol as RolUsuario,
                avatar: found.avatar
              };
              setUser(authUser);
              localStorage.setItem('ecosol_auth_demo', JSON.stringify(authUser));
              return { success: true };
            } else {
              const err = 'Contraseña incorrecta. Por favor intente nuevamente.';
              setError(err);
              return { success: false, error: err };
            }
          }
        } catch {}
      }

      // 4. Fallback to initialUsuarios
      const cleanEmail = email.trim().toLowerCase();
      const seedFound = initialUsuarios.find(
        (u) => u.email?.toLowerCase() === cleanEmail || u.email?.toLowerCase().startsWith(cleanEmail + '@')
      );
      if (seedFound) {
        if (seedFound.estado === 'Inactivo') {
          const err = 'La cuenta de este colaborador está inactiva.';
          setError(err);
          return { success: false, error: err };
        }
        const authUser: UsuarioAuth = {
          id: seedFound.id,
          email: seedFound.email,
          nombres: seedFound.nombre,
          rol: seedFound.rol as RolUsuario,
          avatar: seedFound.avatar
        };
        setUser(authUser);
        localStorage.setItem('ecosol_auth_demo', JSON.stringify(authUser));
        return { success: true };
      }

      const msg = 'Credenciales no encontradas. Verifique el correo electrónico y la contraseña ingresados.';
      setError(msg);
      return { success: false, error: msg };
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
