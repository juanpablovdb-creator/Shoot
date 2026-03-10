-- Quita el trigger que provoca "case not found" (20000) al insertar en projects.
-- La función set_pages_per_day() hace CASE sobre una columna (ej. type) que no coincide
-- con el esquema actual (project_type). Ejecutar en Supabase → SQL Editor.

DROP TRIGGER IF EXISTS trigger_set_pages_per_day ON public.projects;
