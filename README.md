# WhiteMoon · Call Center IA

Panel interno de gestión del call center IA de WhiteMoon. Next.js 16 (App Router, TypeScript) + Tailwind v4 + Supabase. Las llamadas las lanza Bland.ai vía Edge Functions.

## Páginas

- `/` — Dashboard general (KPIs, pipeline, actividad por agente)
- `/agentes` — Vista por agente (dental, gestoría, taller, estética)
- `/llamadas` — Histórico de llamadas con filtros y detalle
- `/prospectos` — Listas de prospectos y lanzamiento de llamadas

## Acceso

Panel **interno**, protegido por middleware. Usuario: `whitemoon`, contraseña en `PANEL_PASSWORD`. La sesión se guarda en una cookie httpOnly (12 h). Todas las rutas requieren login excepto `/login`.

## Variables de entorno

Crea `.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mlaqtniujnvfxcvcourm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key del proyecto>   # solo SELECT (RLS)
BLAND_WEBHOOK_URL=https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/bland-outbound
PANEL_PASSWORD=<clave fuerte del panel>                  # login del panel
```

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` viaja al navegador; con las RLS endurecidas solo permite **lectura**.
- `BLAND_WEBHOOK_URL` y `PANEL_PASSWORD` son **solo servidor** (sin prefijo `NEXT_PUBLIC_`).

## Desarrollo

```bash
npm install
npm run dev   # http://localhost:3000
```

## Seguridad

- RLS de `call_center_calls` y `call_center_prospectos`: `anon`/`authenticated` solo SELECT; escrituras solo `service_role` (Edge Functions). Ver `supabase/migrations/`.
- El lanzamiento de llamadas pasa por `/api/llamar` (servidor) → Edge Function `bland-outbound`, manteniendo el webhook fuera del cliente.
