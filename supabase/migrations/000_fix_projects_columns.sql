-- Ejecutar en Supabase: Dashboard → SQL Editor → New query → Pegar y Run.
-- Añade las columnas que usa la app en la tabla projects.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'serie_plataforma';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_content text;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_file_path text,
  ADD COLUMN IF NOT EXISTS script_file_name text;
