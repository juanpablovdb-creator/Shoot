-- Columna para guardar la ruta del PDF del guion en Storage.
-- Crear el bucket "project-scripts" en Dashboard → Storage → New bucket (privado) si no existe.

-- Necesario para las políticas de Storage (dueño del proyecto)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_file_path text,
  ADD COLUMN IF NOT EXISTS script_file_name text;

COMMENT ON COLUMN projects.script_file_path IS 'Ruta en bucket project-scripts, ej: {project_id}/script.pdf';
COMMENT ON COLUMN projects.script_file_name IS 'Nombre original del archivo PDF para mostrar';

-- RLS para Storage: solo el dueño del proyecto puede leer/escribir su guion.
-- Path esperado: {project_id}/script.pdf (primera parte del path = project_id)
-- Idempotente para poder aplicar con supabase db push aunque ya existan políticas.
DROP POLICY IF EXISTS "Users can upload script PDF for own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can read script PDF of own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can update script PDF of own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete script PDF of own project" ON storage.objects;

CREATE POLICY "Users can upload script PDF for own project"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'project-scripts'
  AND (SELECT user_id FROM public.projects WHERE id = ((storage.foldername(name))[1])::uuid LIMIT 1) = auth.uid()
);

CREATE POLICY "Users can read script PDF of own project"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'project-scripts'
  AND (SELECT user_id FROM public.projects WHERE id = ((storage.foldername(name))[1])::uuid LIMIT 1) = auth.uid()
);

CREATE POLICY "Users can update script PDF of own project"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'project-scripts'
  AND (SELECT user_id FROM public.projects WHERE id = ((storage.foldername(name))[1])::uuid LIMIT 1) = auth.uid()
);

CREATE POLICY "Users can delete script PDF of own project"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'project-scripts'
  AND (SELECT user_id FROM public.projects WHERE id = ((storage.foldername(name))[1])::uuid LIMIT 1) = auth.uid()
);
