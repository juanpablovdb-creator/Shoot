# Housekeeping

Estado del proyecto y enlaces útiles para seguir trabajando.

## Enlaces del proyecto

| Recurso | Ubicación |
|--------|-----------|
| Contexto y reglas de negocio | [.cursor/rules/project-context.mdc](.cursor/rules/project-context.mdc) |
| Configuración y env | [CONFIGURACION.md](CONFIGURACION.md) |
| Setup general | [SETUP.md](SETUP.md) |
| Setup laptop | [SETUP-LAPTOP.md](SETUP-LAPTOP.md) |
| Supabase (migraciones, config) | [supabase/](supabase/) |

## APIs y rutas clave

- **Crear proyecto:** `POST /api/projects/create` (usa service role).
- **Subir PDF del guion:** `POST /api/projects/[projectId]/upload-script`.
- **Parsear guion (IA):** `POST /api/parse-script` — body JSON `{ text, projectId? }`; el cliente extrae texto del PDF y envía solo texto.

## Código relevante

- **Auth:** `middleware.ts`, `src/app/auth/callback/route.ts`, `src/app/(auth)/login/page.tsx`
- **Proyecto nuevo:** `src/app/(dashboard)/projects/new/page.tsx`, `src/app/api/projects/create/route.ts`
- **Upload script:** `src/app/api/projects/[projectId]/upload-script/route.ts`
- **Breakdown:** `src/components/breakdown/BreakdownSheet.tsx`, `ScriptSection.tsx`, `ImportScriptDialog.tsx`
- **Supabase admin (service role):** `src/lib/supabase/admin.ts`

## Cerrado en esta sesión

- Login obligatorio + Google OAuth; middleware redirige a `/login`.
- Crear proyecto vía API con service role (evita RLS en insert).
- Subir PDF del guion vía API (evita RLS en Storage).
- "Cambiar PDF" e "Importar escenas desde este guion" en el desglose usando API y, si hace falta, extracción de PDF en cliente.
- Al entrar al desglose con 0 escenas y guion en DB, se abre automáticamente el diálogo de importar.
- Parse script: solo recibe JSON con `text`; extracción de PDF en cliente; prompt y límite 60k caracteres.

## Variables de entorno

- Cliente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Servidor (APIs): además `SUPABASE_SERVICE_ROLE_KEY` (y en `next.config.ts` si hace falta para inyección).
- IA: `OPENAI_API_KEY` (opcional, para importar guion).

---

Actualizado al cierre de sesión. Ver [BACKLOG.md](BACKLOG.md) para pendientes.
