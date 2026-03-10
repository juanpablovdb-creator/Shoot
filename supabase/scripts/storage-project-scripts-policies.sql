-- Políticas de Storage para el bucket "project-scripts".
-- Ejecutar en Supabase: SQL Editor → New query → Pegar → Run.
-- El bucket debe existir (Dashboard → Storage → Create bucket "project-scripts").

-- Columnas en projects por si no se aplicaron migraciones
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_file_path text,
  ADD COLUMN IF NOT EXISTS script_file_name text;

-- Eliminar políticas si existen (idempotente)
DROP POLICY IF EXISTS "Users can upload script PDF for own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can read script PDF of own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can update script PDF of own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete script PDF of own project" ON storage.objects;

-- RLS: solo el dueño del proyecto puede leer/escribir su guion.
-- Path esperado: {project_id}/script.pdf
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
