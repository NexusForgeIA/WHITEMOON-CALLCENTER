-- Migración a Retell AI: guarda el call_id que devuelve Retell por cada llamada.
-- Aditiva e idempotente (IF NOT EXISTS): segura de re-ejecutar.
ALTER TABLE call_center_calls
  ADD COLUMN IF NOT EXISTS retell_call_id TEXT;
