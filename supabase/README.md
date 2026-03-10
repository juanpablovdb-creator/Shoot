# Migraciones de Supabase

Las migraciones en `migrations/` se aplican a la base de datos remota desde la terminal (sin usar el SQL Editor del dashboard). Los archivos en `scripts/` son copias para ejecución manual en el SQL Editor; la sincronización con el CLI se hace con `supabase db push` usando solo `migrations/`.

## Requisito: Supabase CLI

Instala la CLI si no la tienes:

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# npm (global)
npm install -g supabase
```

## Primera vez: vincular el proyecto

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. En **Project Settings** → **General** copia el **Reference ID** (ej: `abcdefghijklmnop`).
3. En la terminal, desde la raíz del repo:

```bash
npm run db:link
# o: supabase link --project-ref TU_REFERENCE_ID
```

4. Si pide la contraseña de la base de datos, úsala (o déjala en blanco si no quieres validar).

## Aplicar migraciones

Cada vez que añadas o cambies archivos en `supabase/migrations/`, aplica los cambios al remoto con:

```bash
npm run db:push
# o: supabase db push
```

Solo se ejecutan las migraciones que aún no están aplicadas en el remoto.

## Resumen de comandos

| Comando        | Descripción                          |
|----------------|--------------------------------------|
| `npm run db:link` | Vincular este repo al proyecto Supabase (solo una vez) |
| `npm run db:push`  | Subir migraciones pendientes al remoto        |
