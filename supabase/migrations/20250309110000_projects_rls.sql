-- RLS para la tabla projects: cada usuario solo ve y edita sus proyectos.
-- Necesario para que insert + select devuelva la fila (evita "case not found" / 0 rows).
-- Se aplica con: supabase db push (o supabase migration up)

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own project" ON public.projects;
CREATE POLICY "Users can insert own project"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can select own projects" ON public.projects;
CREATE POLICY "Users can select own projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own project" ON public.projects;
CREATE POLICY "Users can update own project"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own project" ON public.projects;
CREATE POLICY "Users can delete own project"
ON public.projects FOR DELETE TO authenticated
USING (auth.uid() = user_id);
