-- Tipos de proyecto soportados por la app (columna text project_type).
-- cortometraje: la API puede mapear la columna legacy "type" a largometraje_nacional
-- si en tu BD "type" es un enum antiguo sin este valor.
COMMENT ON COLUMN public.projects.project_type IS
  'serie_plataforma | novela | largometraje_service | largometraje_nacional | cortometraje';
