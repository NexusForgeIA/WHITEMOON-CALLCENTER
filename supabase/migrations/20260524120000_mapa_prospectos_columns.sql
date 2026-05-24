-- Mapa + Sofía prospectora: columnas geográficas y de análisis en prospectos.
-- Aditiva e idempotente (IF NOT EXISTS): segura de re-ejecutar.
ALTER TABLE call_center_prospectos
  ADD COLUMN IF NOT EXISTS lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS lng DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS dolor TEXT,
  ADD COLUMN IF NOT EXISTS prioridad INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS analisis_web JSONB;

-- Índice para cargar rápido los prospectos con coordenadas en el mapa.
CREATE INDEX IF NOT EXISTS idx_prospectos_latlng
  ON call_center_prospectos (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;
