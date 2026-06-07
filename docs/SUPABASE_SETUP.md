# Configuración de Supabase

## 1. Crear proyecto

1. Entrá a [supabase.com](https://supabase.com) y creá un proyecto nuevo.
2. Elegí región cercana (ej. South America) y guardá la contraseña de la base de datos.

## 2. Ejecutar la migración

1. En el dashboard de Supabase, andá a **SQL Editor**.
2. Copiá y ejecutá el contenido de [`supabase/migrations/001_phase1.sql`](../supabase/migrations/001_phase1.sql).

## 3. Google OAuth

### Google Cloud Console

1. Creá un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
3. Tipo: **Web application**.
4. **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Reemplazá `<project-ref>` por el ID de tu proyecto Supabase (Settings → General → Reference ID).
5. Copiá **Client ID** y **Client Secret**.

### Supabase

1. **Authentication → Providers → Google**: habilitá y pegá Client ID y Secret.
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: agregá `http://localhost:3000/auth/callback`

## 4. Variables de entorno

1. Copiá `.env.local.example` a `.env.local`.
2. Completá con **Project URL** y **anon public key** (Settings → API en Supabase).

```bash
cp .env.local.example .env.local
```

## 5. Correr la app

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) e iniciá sesión con Google.
