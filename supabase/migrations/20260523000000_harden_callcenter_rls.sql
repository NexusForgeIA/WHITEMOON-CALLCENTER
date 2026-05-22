-- Endurece las RLS del call center.
-- Aplicada en Supabase (proyecto mlaqtniujnvfxcvcourm) el 2026-05-23.
--
-- Antes: politica "Allow all for service role" (public, ALL, true) -> cualquiera
-- con la anon key podia leer/escribir/borrar.
-- Ahora: anon + authenticated solo SELECT. INSERT/UPDATE/DELETE solo via
-- service_role (que bypassa RLS), que es lo que usan las Edge Functions
-- bland-outbound y bland-webhook.

alter table public.call_center_calls enable row level security;
alter table public.call_center_prospectos enable row level security;

-- Elimina las politicas permisivas antiguas
drop policy if exists "Allow all for service role" on public.call_center_calls;
drop policy if exists "Allow all for service role" on public.call_center_prospectos;

-- Solo lectura para el panel (anon) y futuros usuarios autenticados
create policy "cc_calls_select_panel"
  on public.call_center_calls
  for select
  to anon, authenticated
  using (true);

create policy "cc_prospectos_select_panel"
  on public.call_center_prospectos
  for select
  to anon, authenticated
  using (true);
