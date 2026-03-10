-- Lista triggers en la tabla public.projects (para diagnosticar "case not found" 20000).
-- Ejecutar en Supabase → SQL Editor. Si aparece algún trigger, ese código puede tener
-- un CASE sin ELSE y lanzar 20000. Para quitarlo: DROP TRIGGER nombre_del_trigger ON public.projects;

SELECT
  tgname AS trigger_name,
  pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'projects'
  AND NOT t.tgisinternal;
