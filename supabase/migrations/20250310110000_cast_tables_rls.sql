-- RLS para cast_members y scene_cast (desglose / stripboard).
-- Mismo criterio: solo proyectos del usuario (projects.user_id = auth.uid()).

-- cast_members
ALTER TABLE public.cast_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage cast_members of own project" ON public.cast_members;
CREATE POLICY "Users can manage cast_members of own project"
ON public.cast_members FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = cast_members.project_id AND projects.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = cast_members.project_id AND projects.user_id = auth.uid())
);

-- scene_cast (acceso vía scene -> project)
ALTER TABLE public.scene_cast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage scene_cast of own project" ON public.scene_cast;
CREATE POLICY "Users can manage scene_cast of own project"
ON public.scene_cast FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenes
    JOIN public.projects ON projects.id = scenes.project_id
    WHERE scenes.id = scene_cast.scene_id AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenes
    JOIN public.projects ON projects.id = scenes.project_id
    WHERE scenes.id = scene_cast.scene_id AND projects.user_id = auth.uid()
  )
);
