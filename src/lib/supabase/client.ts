import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Revisa .env.local (una variable por línea), guarda y reinicia: detén el servidor (Ctrl+C) y ejecuta de nuevo npm run dev.'
    )
  }
  return createBrowserClient(url, key)
}
