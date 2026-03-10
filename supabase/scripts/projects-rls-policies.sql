-- RLS para la tabla projects: cada usuario solo ve y edita sus proyectos.
-- Sincronizar con CLI: supabase db push (usa la migración 20250309110000_projects_rls.sql).
-- Manual: Supabase → SQL Editor → New query → Pegar → Run.

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
