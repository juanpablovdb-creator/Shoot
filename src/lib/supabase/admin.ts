import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnvLocal(): Record<string, string> {
  const cwd = process.cwd()
  const pathsToTry = [
    resolve(cwd, '.env.local'),
    resolve(cwd, '.env'),
    resolve(cwd, '..', '.env.local'),
    resolve(cwd, '..', '..', '.env.local'),
  ]
  for (const filePath of pathsToTry) {
    try {
      if (!existsSync(filePath)) continue
      const content = readFileSync(filePath, 'utf8')
      const out: Record<string, string> = {}
      for (const line of content.split(/\r?\n/)) {
        const m = line.match(/^([^#=]+)=(.*)$/)
        if (m) out[m[1].trim()] = m[2].trim()
      }
      if (out.NEXT_PUBLIC_SUPABASE_URL || out.SUPABASE_SERVICE_ROLE_KEY) return out
    } catch {
      continue
    }
  }
  return {}
}

/**
 * Cliente Supabase con service role. Solo usar en API routes o server.
 * Bypasea RLS. No exponer SUPABASE_SERVICE_ROLE_KEY al cliente.
 */
export function createAdminClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    const env = loadEnvLocal()
    url = url || env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    key = key || env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  }
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
    )
  }
  return createClient(url, key)
}
