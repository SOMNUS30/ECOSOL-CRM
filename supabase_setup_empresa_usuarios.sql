-- =========================================================================
-- ECOSOL CRM: Tablas para Configuración de Empresa y Gestión de Usuarios
-- Ejecutar en el SQL Editor de Supabase (dashboard.supabase.com)
-- =========================================================================

-- 1. TABLA: CONFIGURACIÓN DE EMPRESA (Persistencia en la nube de nombre, logo, ruc, etc.)
CREATE TABLE IF NOT EXISTS public.configuracion_empresa (
  id INT PRIMARY KEY DEFAULT 1,
  nombre_empresa TEXT DEFAULT 'ECOSOL INMOBILIARIA',
  razon_social TEXT DEFAULT 'ECOSOL INMOBILIARIA S.A.C.',
  ruc TEXT DEFAULT '20608912341',
  direccion TEXT DEFAULT 'Av. San Martín #450, Urb. San José',
  departamento TEXT DEFAULT 'Ica',
  provincia TEXT DEFAULT 'Ica',
  distrito TEXT DEFAULT 'Ica',
  telefono TEXT DEFAULT '952473876',
  email TEXT DEFAULT 'administracion@ecosol.pe',
  logo_url TEXT DEFAULT '/ecosol-logo.png',
  representante_legal TEXT DEFAULT 'Lic. Roberto Mendoza Vargas',
  dni_representante TEXT DEFAULT '45892134',
  banco_principal TEXT DEFAULT 'Banco de Crédito del Perú (BCP)',
  numero_cuenta TEXT DEFAULT '193-9821384-0-12',
  cci TEXT DEFAULT '002-19300982138401290',
  moneda TEXT DEFAULT 'PEN',
  mensaje_whatsapp TEXT,
  pie_pagina_voucher TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS y políticas permisivas para lectura/escritura pública del CRM
ALTER TABLE public.configuracion_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica configuracion_empresa" ON public.configuracion_empresa;
CREATE POLICY "Permitir lectura publica configuracion_empresa" 
  ON public.configuracion_empresa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion configuracion_empresa" ON public.configuracion_empresa;
CREATE POLICY "Permitir insercion configuracion_empresa" 
  ON public.configuracion_empresa FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion configuracion_empresa" ON public.configuracion_empresa;
CREATE POLICY "Permitir actualizacion configuracion_empresa" 
  ON public.configuracion_empresa FOR UPDATE USING (true);

-- Insertar configuración inicial por defecto si no existe
INSERT INTO public.configuracion_empresa (
  id, nombre_empresa, razon_social, ruc, direccion, departamento, provincia, distrito,
  telefono, email, logo_url, representante_legal, dni_representante, banco_principal,
  numero_cuenta, cci, moneda, mensaje_whatsapp, pie_pagina_voucher
) VALUES (
  1,
  'ECOSOL INMOBILIARIA',
  'ECOSOL INMOBILIARIA S.A.C.',
  '20608912341',
  'Av. San Martín #450, Urb. San José',
  'Ica', 'Ica', 'Ica',
  '952473876',
  'administracion@ecosol.pe',
  '/ecosol-logo.png',
  'Lic. Roberto Mendoza Vargas',
  '45892134',
  'Banco de Crédito del Perú (BCP)',
  '193-9821384-0-12',
  '002-19300982138401290',
  'PEN',
  'Estimado(a) {cliente}, le saludamos de {empresa}. Le recordamos que su Cuota #{cuota} por un monto de S/ {monto} (Lote Mz {manzana} Lt {lote}, Contrato {contrato}) vence el {fecha}. Puede abonar vía BCP, Yape o Interbank. Agradecemos su puntualidad.',
  'Comprobante digital del sistema ERP {empresa}. Válido como constancia de amortización y acreditación contable.'
) ON CONFLICT (id) DO NOTHING;


-- 2. TABLA: USUARIOS DEL SISTEMA (Con contraseña, foto/avatar y roles)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  rol TEXT NOT NULL DEFAULT 'Asesor de Ventas',
  estado TEXT NOT NULL DEFAULT 'Activo',
  telefono TEXT,
  avatar TEXT,
  ultimo_acceso TEXT DEFAULT 'Nunca',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS y políticas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica usuarios" ON public.usuarios;
CREATE POLICY "Permitir lectura publica usuarios" 
  ON public.usuarios FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion usuarios" ON public.usuarios;
CREATE POLICY "Permitir insercion usuarios" 
  ON public.usuarios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion usuarios" ON public.usuarios;
CREATE POLICY "Permitir actualizacion usuarios" 
  ON public.usuarios FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir eliminacion usuarios" ON public.usuarios;
CREATE POLICY "Permitir eliminacion usuarios" 
  ON public.usuarios FOR DELETE USING (true);

-- Insertar usuarios iniciales del equipo
INSERT INTO public.usuarios (id, nombre, email, password, rol, estado, avatar, ultimo_acceso)
VALUES 
  ('usr-admin-01', 'Lic. Roberto Mendoza V.', 'admin.gerencia@ecosol.pe', 'admin123', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250', 'Hoy'),
  ('usr-cobranzas-02', 'Sandra Morales Prado', 'cobranzas.caja@ecosol.pe', 'caja123', 'Cobranzas / Caja', 'Activo', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250', 'Ayer'),
  ('usr-asesor-03', 'Carlos Mendoza Torres', 'asesor.ventas@ecosol.pe', 'ventas123', 'Asesor de Ventas', 'Activo', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250', 'Hace 1 hora')
ON CONFLICT (id) DO NOTHING;
