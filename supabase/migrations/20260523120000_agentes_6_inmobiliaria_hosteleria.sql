-- Amplía los agentes permitidos a 6: añade inmobiliaria (Carlos) y hosteleria (Sara)
-- al CHECK de agente en ambas tablas del call center.
-- Aplicada en Supabase (proyecto mlaqtniujnvfxcvcourm) el 2026-05-23.
--
-- El modelo se mantiene por CÓDIGO DE SECTOR (no por nombre de persona): la
-- columna agente sigue guardando el sector y lib/agentes.ts mapea sector -> persona.

alter table public.call_center_calls
  drop constraint if exists call_center_calls_agente_check;
alter table public.call_center_calls
  add constraint call_center_calls_agente_check
  check (
    agente = any (
      array['dental', 'gestoria', 'taller', 'estetica', 'inmobiliaria', 'hosteleria']
    )
  );

alter table public.call_center_prospectos
  drop constraint if exists call_center_prospectos_agente_check;
alter table public.call_center_prospectos
  add constraint call_center_prospectos_agente_check
  check (
    agente = any (
      array['dental', 'gestoria', 'taller', 'estetica', 'inmobiliaria', 'hosteleria']
    )
  );
