-- Añade columnas project_type y script_content a projects para desglose.
-- Ejecutar en Supabase: SQL Editor o `supabase db push` si usas CLI.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'serie_plataforma';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_content text;

COMMENT ON COLUMN projects.project_type IS 'serie_plataforma | novela | largometraje_service | largometraje_nacional';
COMMENT ON COLUMN projects.script_content IS 'Texto del guion para hacer el desglose de escenas';
