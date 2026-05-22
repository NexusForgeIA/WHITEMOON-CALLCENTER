# Despliegue en Vercel

Panel interno Next.js 16. Vercel detecta Next.js automáticamente: `next build`, sin configuración extra de build.

## Configuración incluida

`vercel.json` fija la **región `dub1` (Dublín)** para las funciones de servidor, co-localizadas con el proyecto Supabase (`eu-west-1`). Así las lecturas server-side al DB tienen latencia mínima.

## Variables de entorno (Vercel → Project → Settings → Environment Variables)

Configúralas para **Production** (y Preview si usas ramas). Ninguna lleva `NEXT_PUBLIC_`: nada de Supabase se expone al navegador.

| Variable | Valor | Sensible |
|---|---|---|
| `SUPABASE_URL` | `https://mlaqtniujnvfxcvcourm.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key del proyecto (Supabase → Settings → API) | **Sí** |
| `BLAND_WEBHOOK_URL` | `https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/bland-outbound` | No |
| `PANEL_PASSWORD` | contraseña fuerte para el login del panel (usuario: `whitemoon`) | **Sí** |

> `NEXT_PUBLIC_SUPABASE_ANON_KEY` ya **no** se usa: no la configures.

## Despliegue

### Opción A — Dashboard (recomendada)

1. [vercel.com/new](https://vercel.com/new) → importa el repo `NexusForgeIA/WHITEMOON-CALLCENTER`.
2. Framework: **Next.js** (autodetectado). Build/Output: por defecto.
3. Añade las 4 variables de entorno de la tabla.
4. **Deploy**.

### Opción B — CLI

```bash
npm i -g vercel
vercel login
vercel link            # vincula el repo al proyecto
# Añade las variables (repite para cada una):
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add BLAND_WEBHOOK_URL production
vercel env add PANEL_PASSWORD production
vercel --prod          # despliegue a producción
```

## Tras el despliegue

- Entra en `https://<tu-deploy>.vercel.app` → te redirige a `/login`.
- Usuario `whitemoon` + el `PANEL_PASSWORD` que configuraste.
- Comprueba que el dashboard carga (lectura server-side con service_role).
- Si lanzas una llamada de prueba desde `/prospectos`, verifica en Supabase que se creó la fila en `call_center_calls` y que el prospecto pasó a `llamando` con `intentos` incrementado.

## Notas

- **Node**: Next.js 16 requiere Node 20+ (la versión por defecto de Vercel ya lo cumple).
- **Edge Functions de Supabase** (`bland-outbound`, `bland-webhook`) no se despliegan en Vercel; viven en Supabase. El panel solo las invoca vía `/api/llamar`.
- La autenticación del panel (middleware) protege todas las rutas salvo `/login`. La sesión es una cookie httpOnly de 12 h.
