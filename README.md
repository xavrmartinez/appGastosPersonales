# Gastos Personales

App web para controlar ingresos y gastos mensuales. Fase 1 incluye resumen mensual con items recurrentes y de un solo mes, autenticación con Google y acceso desde celular o computadora.

## Stack

- Next.js + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + PostgreSQL)

## Inicio rápido

1. Cloná el repo e instalá dependencias:

```bash
npm install
```

2. Configurá Supabase siguiendo [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

3. Copiá las variables de entorno:

```bash
cp .env.local.example .env.local
```

4. Ejecutá la migración SQL en Supabase (`supabase/migrations/001_phase1.sql`).

5. Iniciá la app:

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Funcionalidades (Fase 1)

- Login con Google
- Resumen mensual con selector de mes
- Ingresos y gastos recurrentes (se copian automáticamente)
- Items de un solo mes
- Balance automático (ingresos − gastos)
- Navegación con placeholders para Tarjetas (Fase 2) y Hormiga (Fase 3)
