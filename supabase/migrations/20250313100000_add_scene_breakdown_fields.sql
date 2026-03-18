-- Campos de escena para Breakdown Sheet tipo Movie Magic.
-- script_page, script_day, unit, sequence, location (texto), est_time, comments.

ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS script_page integer,
  ADD COLUMN IF NOT EXISTS script_day integer,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS sequence text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS est_time text,
  ADD COLUMN IF NOT EXISTS comments text,
  ADD COLUMN IF NOT EXISTS scene_note text,
  ADD COLUMN IF NOT EXISTS scene_from text;

COMMENT ON COLUMN public.scenes.script_page IS 'Página del guion donde empieza la escena';
COMMENT ON COLUMN public.scenes.script_day IS 'Día del guion (script day)';
COMMENT ON COLUMN public.scenes.unit IS 'Unidad de rodaje';
COMMENT ON COLUMN public.scenes.sequence IS 'Secuencia';
COMMENT ON COLUMN public.scenes.location IS 'Locación (texto libre para breakdown sheet)';
COMMENT ON COLUMN public.scenes.est_time IS 'Tiempo estimado de rodaje';
COMMENT ON COLUMN public.scenes.comments IS 'Comentarios de la escena';
COMMENT ON COLUMN public.scenes.scene_note IS 'Nota del breakdown sheet';
COMMENT ON COLUMN public.scenes.scene_from IS 'From (breakdown sheet)';
