import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  PROJECT_TYPE_KEYS,
  PROJECT_TYPE_LEGACY_DB_TYPE,
} from '@/lib/constants/project-types'
import type { ProjectType } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let body: { name?: string; code?: string | null; project_type?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
    }

    const name = body.name?.trim()
    if (!name) {
      return NextResponse.json({ error: 'name es obligatorio' }, { status: 400 })
    }

    const rawType = body.project_type ?? 'serie_plataforma'
    const projectType: ProjectType = PROJECT_TYPE_KEYS.includes(rawType as ProjectType)
      ? (rawType as ProjectType)
      : 'serie_plataforma'
    const legacyType =
      PROJECT_TYPE_LEGACY_DB_TYPE[projectType] ?? projectType

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('projects')
      .insert({
        name,
        code: body.code || null,
        project_type: projectType,
        type: legacyType,
        user_id: user.id,
      })
      .select('id')
      .limit(1)

    if (error) {
      const err = error as { message: string; code?: string; details?: string }
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 500 }
      )
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) {
      return NextResponse.json(
        { error: 'No se devolvió el id del proyecto', data },
        { status: 500 }
      )
    }

    return NextResponse.json({ id: row.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: message || 'Error al crear el proyecto' },
      { status: 500 }
    )
  }
}
