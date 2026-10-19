# TestBuilder

Plataforma para crear, aplicar y reportar tests de perfil y aptitud. Ver `CLAUDE.md` (contexto) y `PLAN.md` (fases).

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Supabase · Vercel.

## Desarrollo local
```bash
npm install
cp .env.example .env.local   # llena las llaves de tu proyecto Supabase
npm run dev                  # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

## Base de datos
Las migraciones viven en `supabase/migrations/`. Nunca subas `.env.local` ni llaves.
