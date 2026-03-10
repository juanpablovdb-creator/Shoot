-- RLS para la tabla projects (sin DROP = sin aviso "destructive" en Supabase).
-- Ejecutar en Supabase: SQL Editor → New query → Pegar → Run.
-- Si ves "policy already exists", usa projects-rls-policies.sql y confirma "Run this query".

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own project"
ON public.projects FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select own projects"
ON public.projects FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own project"
ON public.projects FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own project"
ON public.projects FOR DELETE TO authenticated
USING (auth.uid() = user_id);
