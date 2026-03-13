-- Cantidad de hojas del guion: la suma de octavos de todas las escenas debe ser exactamente script_total_pages * 8.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_total_pages integer;

COMMENT ON COLUMN projects.script_total_pages IS 'Número de páginas del guion; suma(page_eighths) de escenas = script_total_pages * 8 (cada página = 8 octavos).';
