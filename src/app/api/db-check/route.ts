import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

/**
 * GET /api/db-check — Verifica conexión a Supabase usando .env.local
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Faltan variables de entorno',
        details: {
          hasUrl: !!url,
          hasAnonKey: !!key,
        },
      },
      { status: 500 }
    )
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('projects').select('id').limit(1)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Error al consultar Supabase',
          details: error.message,
          code: error.code,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      message: 'Base de datos conectada correctamente',
      url: url.replace(/^https:\/\//, 'https://***.'), // ocultar subdominio
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Excepción al conectar',
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    )
  }
}
