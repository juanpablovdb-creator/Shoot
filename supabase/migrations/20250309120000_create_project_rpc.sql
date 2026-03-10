-- Función RPC para crear proyecto y devolver el id sin depender de RLS en SELECT.
-- Así la app funciona aunque RLS no permita leer la fila recién insertada.

CREATE OR REPLACE FUNCTION public.create_project(
  p_name text,
  p_code text,
  p_project_type text DEFAULT 'serie_plataforma'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  INSERT INTO public.projects (name, code, project_type, user_id)
  VALUES (p_name, p_code, p_project_type, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.create_project IS 'Crea un proyecto para el usuario autenticado y devuelve su id.';

REVOKE ALL ON FUNCTION public.create_project(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_project(text, text, text) TO authenticated;

-- Actualizar ruta del PDF del guion (solo dueño del proyecto).
CREATE OR REPLACE FUNCTION public.update_project_script(
  p_project_id uuid,
  p_script_file_path text,
  p_script_file_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects
  SET script_file_path = p_script_file_path, script_file_name = p_script_file_name
  WHERE id = p_project_id AND user_id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.update_project_script IS 'Actualiza script_file_path y script_file_name del proyecto si el usuario es el dueño.';

REVOKE ALL ON FUNCTION public.update_project_script(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_project_script(uuid, text, text) TO authenticated;

-- Recarga la caché de PostgREST para que la API vea las nuevas funciones.
NOTIFY pgrst, 'reload schema';
