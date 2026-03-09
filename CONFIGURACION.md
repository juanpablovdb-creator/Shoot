# Configuración

## Variables de entorno (.env.local)

Copia `.env.local.example` a `.env.local` y rellena los valores.

**Obligatorias (Supabase):**

- `NEXT_PUBLIC_SUPABASE_URL` – URL del proyecto (Dashboard → Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Clave anon (Dashboard → Settings → API)

Cada variable en **una línea**, sin espacios alrededor del `=`.

**Opcional (importar guiones con IA):**

- `OPENAI_API_KEY` – Para usar "Importar guion" con GPT-4o-mini

## Si ves "Faltan NEXT_PUBLIC_SUPABASE_URL..."

1. Abre `.env.local` en la raíz del proyecto.
2. Comprueba que existan las dos líneas (URL y ANON_KEY).
3. **Cierra el servidor** (Ctrl+C en la terminal donde corre `npm run dev`).
4. Vuelve a ejecutar: `npm run dev`.

Next.js carga las variables al **iniciar** el servidor. Si editaste `.env.local` con el servidor ya en marcha, hay que reiniciar para que se apliquen.
