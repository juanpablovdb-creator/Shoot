# Backlog

Pendientes y mejoras para siguientes sesiones.

## Desglose / guion

- [ ] Auto-abrir diálogo de importar cuando hay **solo PDF** (sin `script_content`): al entrar con 0 escenas, abrir diálogo y extraer texto del PDF en segundo plano para que el usuario solo pulse "Importar".
- [ ] Revisar manejo cuando `signedUrl` falla (Storage RLS o archivo inexistente): mensajes claros y opción "Volver a subir PDF".

## Proyectos y auth

- [ ] Comprobar flujo completo: login → crear proyecto → subir PDF → ir al desglose → importar escenas (una pasada de punta a punta).
- [ ] (Opcional) Guardar `script_content` al subir PDF si en el futuro se extrae texto en servidor.

## Base de datos / Supabase

- [ ] Trigger `trigger_set_pages_per_day`: ya eliminado con [supabase/scripts/drop-trigger-set-pages-per-day.sql](supabase/scripts/drop-trigger-set-pages-per-day.sql); confirmar que no se recrea en nuevas migraciones.
- [ ] Regenerar tipos si cambia el schema: `supabase gen types typescript`.

## Calidad y despliegue

- [ ] Lint y tests antes de commit.
- [ ] Probar en staging/producción con variables de entorno correctas (Redirect URLs en Supabase, `SUPABASE_SERVICE_ROLE_KEY` en el host).

---

Enlace: [HOUSEKEEPING.md](HOUSEKEEPING.md) para estado actual y enlaces.
