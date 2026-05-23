-- Datos demo para dar vida al ranking y a las animaciones de la oficina 3D.
-- Aplicada en Supabase (proyecto mlaqtniujnvfxcvcourm) el 2026-05-23.
--
-- Todos los registros llevan notas = 'seed-demo' para poder limpiarlos:
--   delete from public.call_center_calls      where notas = 'seed-demo';
--   delete from public.call_center_prospectos where notas = 'seed-demo';
--
-- Distribución pensada para mostrar los 4 estados de animación:
--   Marcos (dental)        -> llamando    (1 llamada en_curso)
--   Laura  (gestoria)      -> tramitando  (1 llamada pendiente)
--   Carlos (inmobiliaria)  -> celebrando  (cita agendada en las últimas 24h) + líder
--   Diego/Ana/Sara         -> disponible

insert into public.call_center_calls
  (agente, nombre, telefono, empresa, sector, estado, duracion_segundos,
   pipeline_estado, cita_agendada, cita_fecha, resumen, notas, created_at)
select
  d.agente, d.nombre, d.telefono, d.empresa, d.agente, d.estado, d.dur,
  d.pipeline, d.cita, d.cita_fecha, d.resumen, 'seed-demo', d.created_at
from (
  values
  -- Marcos / dental -> llamando
  ('dental','Clínica Sonrisa','+34910000001','Clínica Sonrisa Demo','en_curso',NULL,'contactado',false,NULL,'Llamada en curso', now() - interval '8 minutes'),
  ('dental','Dr. Pérez','+34910000002','Dental Pérez Demo','completada',95,'cerrado',true, now() + interval '2 days','Cita cerrada para revisión', now() - interval '3 days'),
  ('dental','Odonto Madrid','+34910000003','Odonto Madrid Demo','completada',60,'no_interesado',false,NULL,'Pide info por email', now() - interval '2 days'),
  ('dental','Dental Sur','+34910000004','Dental Sur Demo','contestada',40,'no_interesado',false,NULL,'Contestada', now() - interval '2 days'),
  ('dental','Implantes Norte','+34910000005','Implantes Norte Demo','no_contestada',NULL,'nuevo',false,NULL,'No contesta', now() - interval '1 day'),

  -- Laura / gestoria -> tramitando
  ('gestoria','Asesoría García','+34910000011','Asesoría García Demo','pendiente',NULL,'nuevo',false,NULL,'Programada', now() - interval '25 minutes'),
  ('gestoria','Gestoría López','+34910000012','Gestoría López Demo','completada',110,'cerrado',true, now() + interval '4 days','Cliente cerrado', now() - interval '4 days'),
  ('gestoria','Fiscal Plus','+34910000013','Fiscal Plus Demo','completada',70,'no_interesado',false,NULL,'Valorando', now() - interval '3 days'),
  ('gestoria','Laboral Madrid','+34910000014','Laboral Madrid Demo','contestada',45,'no_interesado',false,NULL,'Contestada', now() - interval '2 days'),

  -- Diego / taller -> disponible
  ('taller','Talleres Ruiz','+34910000021','Talleres Ruiz Demo','completada',80,'cerrado',false,NULL,'Cerrado', now() - interval '5 days'),
  ('taller','AutoFix','+34910000022','AutoFix Demo','completada',55,'no_interesado',false,NULL,'No interesado', now() - interval '4 days'),
  ('taller','Neumáticos Express','+34910000023','Neumáticos Demo','no_contestada',NULL,'nuevo',false,NULL,'No contesta', now() - interval '3 days'),

  -- Ana / estetica -> disponible
  ('estetica','Centro Belleza Luz','+34910000031','Belleza Luz Demo','completada',90,'cerrado',true, now() + interval '6 days','Cierre con cita', now() - interval '6 days'),
  ('estetica','Estética Bella','+34910000032','Estética Bella Demo','completada',50,'no_interesado',false,NULL,'No interesado', now() - interval '5 days'),
  ('estetica','Spa Madrid','+34910000033','Spa Madrid Demo','buzon',NULL,'nuevo',false,NULL,'Buzón de voz', now() - interval '4 days'),

  -- Carlos / inmobiliaria -> celebrando + líder
  ('inmobiliaria','Inmo Centro','+34910000041','Inmo Centro Demo','completada',120,'cerrado',true, now() + interval '1 day','Cierre, visita agendada', now() - interval '3 hours'),
  ('inmobiliaria','Pisos Madrid','+34910000042','Pisos Madrid Demo','completada',100,'cerrado',true, now() + interval '3 days','Cierre', now() - interval '2 days'),
  ('inmobiliaria','Hogar Real','+34910000043','Hogar Real Demo','completada',85,'cerrado',false,NULL,'Cerrado', now() - interval '3 days'),
  ('inmobiliaria','Fincas Norte','+34910000044','Fincas Norte Demo','completada',60,'no_interesado',false,NULL,'Valorando', now() - interval '4 days'),
  ('inmobiliaria','Alquileres Sur','+34910000045','Alquileres Sur Demo','contestada',40,'no_interesado',false,NULL,'Contestada', now() - interval '5 days'),

  -- Sara / hosteleria -> disponible
  ('hosteleria','Restaurante Sabor','+34910000051','Rte Sabor Demo','completada',95,'cerrado',true, now() + interval '2 days','Cierre con reserva', now() - interval '3 days'),
  ('hosteleria','Bar Central','+34910000052','Bar Central Demo','completada',70,'cerrado',false,NULL,'Cerrado', now() - interval '4 days'),
  ('hosteleria','Tapas Madrid','+34910000053','Tapas Madrid Demo','completada',55,'no_interesado',false,NULL,'Valorando', now() - interval '5 days'),
  ('hosteleria','Cafetería Luna','+34910000054','Cafetería Luna Demo','contestada',35,'no_interesado',false,NULL,'Contestada', now() - interval '6 days')
) as d(agente, nombre, telefono, empresa, estado, dur, pipeline, cita, cita_fecha, resumen, created_at);

-- Prospectos pendientes por agente (alimentan "Prospectos pend.")
insert into public.call_center_prospectos
  (nombre, telefono, empresa, sector, agente, estado, intentos, notas)
select
  'Prospecto ' || a.agente || ' ' || g.n,
  '+3491100' || lpad((a.base + g.n)::text, 4, '0'),
  initcap(a.agente) || ' Lead ' || g.n || ' Demo',
  a.agente,
  a.agente,
  'pendiente',
  0,
  'seed-demo'
from (
  values
  ('dental', 2, 100),
  ('gestoria', 5, 200),
  ('taller', 1, 300),
  ('estetica', 2, 400),
  ('inmobiliaria', 4, 500),
  ('hosteleria', 3, 600)
) as a(agente, cnt, base)
cross join lateral generate_series(1, a.cnt) as g(n);
