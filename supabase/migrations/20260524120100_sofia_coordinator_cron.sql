-- Cron del reporte diario de Sofía (Edge Function sofia-coordinator).
-- Requiere pg_cron y pg_net (ya instalados en el proyecto).
--
-- Hora: pg_cron corre en UTC. 18:00 UTC = 20:00 Europe/Madrid en verano (CEST).
-- En invierno (CET) cambiar a '0 19 * * *' para mantener las 20:00 locales.
-- cron.schedule hace upsert por nombre de job → idempotente.
select cron.schedule(
  'sofia-daily-report',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/sofia-coordinator',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
