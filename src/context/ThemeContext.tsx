import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark';

export interface ColorThemeOption {
  id: string;
  name: string;
  category: string;
  description: string;
  primary: string;
  accent: string;
  lightBg: string;
  border: string;
  text: string;
  palette: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
    950: string;
  };
}

export const COLOR_THEMES: ColorThemeOption[] = [
  {
    id: 'verde-corporativo',
    name: 'Verde Corporativo (Efficy CRM)',
    category: 'Equilibrio & Confort Visual',
    description: 'Inspirado en ERPs corporativos modernos. Tono verde natural y mate que cuida la vista y evita fatiga ocular.',
    primary: '#3d8433',
    accent: '#4da041',
    lightBg: '#f2f8f0',
    border: '#c5e3bd',
    text: '#32682a',
    palette: {
      50: '#f2f8f0',
      100: '#e2f1de',
      200: '#c5e3bd',
      300: '#9fd094',
      400: '#74b868',
      500: '#4da041',
      600: '#3d8433',
      700: '#32682a',
      800: '#2a5324',
      900: '#23451f',
      950: '#0f260d'
    }
  },
  {
    id: 'azul-ejecutivo',
    name: 'Azul Ejecutivo (Navy Pro)',
    category: 'Confianza & Finanzas',
    description: 'Azul marino clásico de alta dirección. Estándar de prestigio y formalidad en banca y bienes raíces.',
    primary: '#2563eb',
    accent: '#3b82f6',
    lightBg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1d4ed8',
    palette: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  },
  {
    id: 'petroleo-ejecutivo',
    name: 'Azul Petróleo (Teal Sofisticado)',
    category: 'Innovación & Prestigio',
    description: 'Matiz petróleo contemporáneo y exclusivo. Brinda un acabado tecnológico de vanguardia.',
    primary: '#0d9488',
    accent: '#14b8a6',
    lightBg: '#f0fdfa',
    border: '#99f6e4',
    text: '#0f766e',
    palette: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e'
    }
  },
  {
    id: 'grafito-elegante',
    name: 'Grafito & Carbón (Onyx Minimalista)',
    category: 'Sobriedad & Claridad',
    description: 'Esquema monocromático de máxima legibilidad y sobriedad. Cero distracciones.',
    primary: '#334155',
    accent: '#475569',
    lightBg: '#f8fafc',
    border: '#cbd5e1',
    text: '#1e293b',
    palette: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    }
  },
  {
    id: 'indigo-real',
    name: 'Índigo Real (Luxury Residence)',
    category: 'Distinción & Alta Gama',
    description: 'Púrpura índigo refinado para desarrolladoras y proyectos residenciales exclusivos.',
    primary: '#4f46e5',
    accent: '#6366f1',
    lightBg: '#eef2ff',
    border: '#c7d2fe',
    text: '#4338ca',
    palette: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
      950: '#1e1b4b'
    }
  },
  {
    id: 'terracota-inmobiliario',
    name: 'Terracota Arquitectónico (Warm Terra)',
    category: 'Arquitectura & Acabados',
    description: 'Inspirado en la calidez de los materiales constructivos, ladrillo caravista y madera fina.',
    primary: '#c2410c',
    accent: '#ea580c',
    lightBg: '#fff7ed',
    border: '#fed7aa',
    text: '#9a3412',
    palette: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407'
    }
  }
];

const DEFAULT_COLOR_THEME_ID = 'verde-corporativo';
const COLOR_THEME_STORAGE_KEY = 'ecosol_color_theme';
const MODE_STORAGE_KEY = 'ecosol_theme';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  colorThemeId: string;
  activeColorTheme: ColorThemeOption;
  setColorThemeId: (id: string) => void;
  colorThemes: ColorThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(MODE_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      console.warn('Error reading theme mode:', e);
    }
    return 'light';
  });

  const [colorThemeId, setColorThemeState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      if (saved && COLOR_THEMES.some(t => t.id === saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Error reading color theme:', e);
    }
    return DEFAULT_COLOR_THEME_ID;
  });

  const activeColorTheme = COLOR_THEMES.find(t => t.id === colorThemeId) || COLOR_THEMES[0];

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem(MODE_STORAGE_KEY, theme);
    } catch (e) {
      console.warn(e);
    }
  }, [theme]);

  // Apply CSS color variables dynamically on root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(activeColorTheme.palette).forEach(([shade, hex]) => {
      root.style.setProperty(`--color-emerald-${shade}`, hex);
      root.style.setProperty(`--color-green-${shade}`, hex);
    });

    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, activeColorTheme.id);
    } catch (e) {
      console.warn(e);
    }
  }, [activeColorTheme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setColorThemeId = (id: string) => {
    if (COLOR_THEMES.some(t => t.id === id)) {
      setColorThemeState(id);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isDark: theme === 'dark',
        colorThemeId,
        activeColorTheme,
        setColorThemeId,
        colorThemes: COLOR_THEMES
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
