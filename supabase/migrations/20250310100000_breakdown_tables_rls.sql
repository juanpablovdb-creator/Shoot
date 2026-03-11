-- RLS para tablas del desglose: locations, sets, scenes, breakdown_elements, scene_elements.
-- El usuario solo puede ver y editar filas cuyo proyecto sea suyo (projects.user_id = auth.uid()).

-- locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage locations of own project" ON public.locations;
CREATE POLICY "Users can manage locations of own project"
ON public.locations FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = locations.project_id AND projects.user_id = auth.uid())
);

-- sets
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage sets of own project" ON public.sets;
CREATE POLICY "Users can manage sets of own project"
ON public.sets FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = sets.project_id AND projects.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = sets.project_id AND projects.user_id = auth.uid())
);

-- scenes
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage scenes of own project" ON public.scenes;
CREATE POLICY "Users can manage scenes of own project"
ON public.scenes FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = scenes.project_id AND projects.user_id = auth.uid())
);

-- breakdown_elements
ALTER TABLE public.breakdown_elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage breakdown_elements of own project" ON public.breakdown_elements;
CREATE POLICY "Users can manage breakdown_elements of own project"
ON public.breakdown_elements FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = breakdown_elements.project_id AND projects.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE projects.id = breakdown_elements.project_id AND projects.user_id = auth.uid())
);

-- scene_elements (acceso vía scene -> project)
ALTER TABLE public.scene_elements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage scene_elements of own project" ON public.scene_elements;
CREATE POLICY "Users can manage scene_elements of own project"
ON public.scene_elements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.scenes
    JOIN public.projects ON projects.id = scenes.project_id
    WHERE scenes.id = scene_elements.scene_id AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scenes
    JOIN public.projects ON projects.id = scenes.project_id
    WHERE scenes.id = scene_elements.scene_id AND projects.user_id = auth.uid()
  )
);
