# ECOSOL CRM - Sistema Integral de Gestión Inmobiliaria

Sistema CRM y control de cobranzas inmobiliarias desarrollado con **React**, **TypeScript**, **Tailwind CSS** y **Vite**, conectado a **Supabase** como backend en la nube (PostgreSQL, Storage y Auth).

---

## 🚀 Despliegue en Render (Free Tier)

El frontend de ECOSOL CRM está optimizado para desplegarse como un **Static Site** en **Render**.
> **Ventajas del Static Site en Render (100% Gratuito):**
> - Sin apagados por inactividad (*zero cold starts* / respuesta instantánea).
> - Certificado SSL (HTTPS) automático y CDN global de alta velocidad.
> - La base de datos y lógica de almacenamiento residen de forma permanente en Supabase.

---

### Opción A: Despliegue Automático mediante Blueprint (Recomendado)

El repositorio incluye un archivo [`render.yaml`](./render.yaml).

1. Sube tu código a tu repositorio de **GitHub** o **GitLab**.
2. Entra a tu cuenta en [dashboard.render.com](https://dashboard.render.com).
3. Haz clic en **New +** > **Blueprint**.
4. Conecta tu repositorio `ECOSOL CRM`.
5. Render detectará automáticamente `render.yaml` y configurará:
   - **Tipo:** Static Site
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
   - **Regla de Rewrite SPA:** `/* -> /index.html`
   - **Variables de Entorno de Supabase**
6. Haz clic en **Apply** y tu sistema estará publicado en 1 minuto.

---

### Opción B: Despliegue Manual desde el Dashboard de Render

1. Entra a [dashboard.render.com](https://dashboard.render.com).
2. Haz clic en **New +** > **Static Site**.
3. Selecciona tu repositorio de GitHub / GitLab.
4. Completa la configuración con los siguientes datos:

| Parámetro | Valor |
| :--- | :--- |
| **Name** | `ecosol-crm` (o el nombre que elijas) |
| **Branch** | `main` |
| **Root Directory** | *(Dejar vacío)* |
| **Build Command** | `npm run build` |
| **Publish Directory** | `dist` |

5. **Regla de Redirección SPA (Muy Importante):**
   - En la sección **Redirects/Rewrites**, haz clic en **Add Rule**:
     - **Type:** `Rewrite`
     - **Source:** `/*`
     - **Destination:** `/index.html`
   *(Esto asegura que las rutas internas de la aplicación no den error 404 al recargar).*

6. **Variables de Entorno (Environment Variables):**
   - Ve a la pestaña **Environment** y agrega:
     - `VITE_SUPABASE_URL` = `https://agaeaaskhhudknbvncku.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_Fu3eyGU3dOW5n3Q3WW-5og_zA2kcF8u`
   *(Opcional, ya que el código cuenta con fallback por defecto).*

7. Haz clic en **Create Static Site**.

---

## 🛠️ Comandos Locales

- **Instalar dependencias:** `npm install`
- **Servidor de desarrollo:** `npm run dev`
- **Compilar para producción:** `npm run build`
- **Previsualizar compilación:** `npm run preview`
