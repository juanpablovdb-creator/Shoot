# Desglose y cantidad de apariciones – Schema, código y resumen

Documento para depurar por qué **Cantidad de apariciones** en Cast sale en 0.

---

## 1. Schema (tablas relevantes)

Definiciones según `src/types/database.types.ts` y políticas RLS en `supabase/migrations/`.

### `projects`
- `id`, `user_id`, `name`, `script_content`, `script_file_path`, `script_total_pages`, etc.

### `scenes`
- `id`, `project_id`, `scene_number`, `scene_number_sort`, `int_ext`, `day_night`, `synopsis`, `page_eighths`, `set_id`, `set_name`, `has_stunts`, `has_sfx`, `has_vfx`, …
- Una fila por escena del guion.

### `breakdown_elements`
- `id`, `project_id`, `category`, `name`
- `category`: una de las categorías del desglose (ej. `'cast'`, `'utileria'`, `'stunts'`). **Debe guardarse en minúsculas** (ej. `'cast'`), porque las consultas usan `.ilike('category', 'cast')` o `.eq('category', 'cast')`.
- Una fila por “elemento” del proyecto (ej. un personaje "David", un elemento "Plato"). Los de categoría `cast` son los personajes.

### `scene_elements`
- `id`, `scene_id`, `breakdown_element_id`
- Relación N:M: “en esta escena aparece este elemento del desglose”.
- **Aquí es donde debe estar el cast por escena:** si el personaje "David" (breakdown_element cast) aparece en la escena 3, debe existir una fila `(scene_id = escena 3, breakdown_element_id = id de David)`.

### `cast_members`
- `id`, `project_id`, `character_name`, `cast_number`, `actor_name`, `availability_notes`
- Lista de personajes del proyecto (para Cast y stripboard). Se crean en la importación a partir de los elementos `cast` del parse.

### `scene_cast`
- `id`, `scene_id`, `cast_member_id`
- “En esta escena participa este cast_member.” Se usa sobre todo para stripboard. **El conteo de apariciones en la UI de Cast no usa esta tabla;** usa solo `scene_elements` + `breakdown_elements` (cast).

---

## 2. Flujo del desglose (cómo se llena todo)

### Paso 1: Parse (IA)
- **API:** `POST /api/parse-script`  
- **Body:** `{ text: string, projectId?: string, useGpt4?: boolean }`
- **Respuesta:** `{ scenes: ParsedScene[] }`
- Cada escena tiene: `sceneNumber`, `intExt`, `dayNight`, `sceneHeading`, `synopsis`, `pageEighths`, **`elements`** (array de `{ category, name }`).
- Si una escena no trae ningún elemento con `category === 'cast'`, el parse añade cast inferido desde la sinopsis o un placeholder `"Personaje (revisar)"`.
- **Código:** `src/app/api/parse-script/route.ts`

### Paso 2: Importación en servidor
- **API:** `POST /api/projects/[projectId]/breakdown/import`  
- **Body:** `{ scenes: ParsedScene[], scriptTotalPages?, saveScriptContent? }`
- **Código:** `src/app/api/projects/[projectId]/breakdown/import/route.ts` → llama a `createScenesFromParsedCore` y luego `syncCastFromBreakdown`.

**Dentro de `createScenesFromParsedCore`** (`src/lib/breakdown-import-core.ts`):

1. Por cada escena a insertar (no duplicada por `scene_number`):
   - Se crea una fila en `scenes`.
   - Se normaliza `category` a minúsculas (en especial `'cast'`).
   - Por cada `element` en `elements`:
     - Se busca o crea una fila en `breakdown_elements` (`project_id`, `category`, `name`).
     - Se inserta una fila en **`scene_elements`** (`scene_id`, `breakdown_element_id`).  
     **Si aquí falla el insert (RLS, constraint, etc.) o no se hace para cast, esa escena no tendrá cast en el desglose.**
   - Luego, solo para elementos con `category === 'cast'`:
     - Se busca o crea el `cast_member` por nombre.
     - Se inserta en **`scene_cast`** (`scene_id`, `cast_member_id`) (para stripboard).

2. Antes del bucle, si una escena no tiene ningún elemento con categoría cast, se le añaden elementos cast inferidos desde la sinopsis o `["Personaje (revisar)"]`.

### Paso 3: Cómo se obtiene la lista de Cast y las apariciones

- **Página Cast:** `src/app/(dashboard)/projects/[projectId]/cast/page.tsx`  
  - Llama `syncCastFromBreakdown(supabase, projectId)` (crea cast_members que falten y rellena `scene_cast`).
  - Llama `getCastFromBreakdown(supabase, projectId)` → lista con `appearance_count`.
  - Llama `getSceneCastBreakdown(supabase, projectId)` → desglose escena por escena para la tabla de depuración.

**Conteo de apariciones** (`src/lib/sync-cast.ts`):

1. **`getSceneCastBreakdown(projectId)`**
   - Lee `scenes` del proyecto.
   - Lee `breakdown_elements` con `category` tipo cast (`.ilike('category', 'cast')`).
   - Lee **`scene_elements`** con `scene_id` en las escenas del proyecto y `breakdown_element_id` en esos elementos cast.
   - Para cada escena, arma la lista de nombres (cast) que aparecen en esa escena.
   - Devuelve `{ scene_number, scene_id, cast_names[] }[]`.  
   **Si aquí todas las escenas tienen `cast_names` vacío, es que en la BD no hay filas en `scene_elements` que relacionen escenas con elementos cast.**

2. **`getCastFromBreakdown(projectId)`**
   - Lee `cast_members` del proyecto.
   - Llama a **`getSceneCastBreakdown(projectId)`** (misma fuente que la tabla de depuración).
   - Para cada `cast_member`, cuenta en cuántas escenas aparece: recorre cada fila del desglose y comprueba si el nombre del personaje (o su “nombre base”, ej. sin “(74)”) está en `cast_names` de esa escena.
   - Ordena por ese conteo (más apariciones primero) y devuelve la lista con `appearance_count` = ese número.

Por tanto, **la cantidad de apariciones depende al 100% de que `getSceneCastBreakdown` devuelva nombres en `cast_names`** para las escenas donde realmente aparece el personaje. Eso a su vez depende de que existan filas en **`scene_elements`** que vinculen esas escenas con elementos **`breakdown_elements`** de categoría cast.

---

## 3. Dónde puede fallar (por qué todo en 0)

1. **En la importación no se crean `scene_elements` para cast**
   - El body de `/breakdown/import` no trae `elements` con `category: 'cast'` (o se pierde al enviar).
   - El insert en `scene_elements` falla (RLS, unique, FK) y el error solo se guarda en `errors` sin tirar.
   - La categoría se guarda con otra grafía (ej. `"Cast"`) y luego las consultas con `'cast'` no encuentran; ya se normaliza a minúsculas en import y se usa `.ilike('category', 'cast')` al leer.

2. **No hay elementos cast en `breakdown_elements`**
   - Si `breakdown_elements` no tiene filas con `category = 'cast'` (o ilike cast), `getSceneCastBreakdown` devuelve `cast_names` vacío para todas las escenas y el conteo será 0.

3. **Desajuste de nombres entre `cast_members` y `cast_names`**
   - El conteo hace match por nombre exacto (en minúsculas) o por “nombre base” (quitar edad entre paréntesis). Si en `breakdown_elements` el nombre es distinto al de `cast_members` (espacios, tildes, variante), podría no matchear; en principio se usa el mismo nombre que viene del parse/import.

4. **Proyecto importado antes de los cambios**
   - Proyectos importados cuando no se rellenaba bien cast o no se normalizaba categoría pueden tener `scene_elements` vacío para cast. En ese caso hay que **Rehacer desglose con IA** (borra escenas, cast y elementos cast y vuelve a importar).

---

## 4. Archivos de código clave

| Qué | Archivo |
|-----|---------|
| Parse (IA) → `scenes` con `elements` | `src/app/api/parse-script/route.ts` |
| Importación → `scenes`, `breakdown_elements`, `scene_elements`, `cast_members`, `scene_cast` | `src/lib/breakdown-import-core.ts` |
| API de import | `src/app/api/projects/[projectId]/breakdown/import/route.ts` |
| Desglose por escena (tabla “qué personajes en cada escena”) | `src/lib/sync-cast.ts` → `getSceneCastBreakdown` |
| Lista Cast + cantidad de apariciones | `src/lib/sync-cast.ts` → `getCastFromBreakdown` |
| Página Cast (datos + tabla depuración) | `src/app/(dashboard)/projects/[projectId]/cast/page.tsx` |
| Tipos BD | `src/types/database.types.ts` |

---

## 5. Cómo preguntar el problema de forma concreta

Puedes usar algo así:

- “En mi proyecto, la página Cast muestra **Cantidad de apariciones** en 0 para todos los personajes. El desglose se hace así: (1) parse con IA devuelve escenas con `elements` (incluido cast); (2) la importación en servidor crea `scenes`, `breakdown_elements`, y por cada elemento inserta en `scene_elements` (scene_id, breakdown_element_id); (3) la lista de Cast y el conteo se calculan leyendo `scene_elements` + `breakdown_elements` (category cast) y contando en cuántas escenas aparece cada personaje. La tabla de depuración en la misma página muestra escena por escena qué personajes reconoce el desglose: si ahí todas las escenas salen sin personajes, el problema está en que no hay filas en `scene_elements` que vinculen escenas con elementos cast. ¿Qué puede hacer que en la importación no se estén creando esas filas en `scene_elements` para categoría cast, o que las consultas no las encuentren (por ejemplo por RLS, por categoría guardada con mayúsculas, o por cómo se envía el body a la API de import)?”

Con el schema y este resumen puedes acotar si el fallo está en el parse, en la importación (insert en `scene_elements`/`breakdown_elements`), en las consultas (getSceneCastBreakdown / getCastFromBreakdown) o en datos antiguos (re-importar/rehacer desglose).
