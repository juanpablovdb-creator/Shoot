import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH /api/projects/[projectId] – Actualizar proyecto (nombre, código, etc.)
 * DELETE /api/projects/[projectId] – Eliminar proyecto
 */
async function getProjectForUser(projectId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.id) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()
  if (fetchError || !project) {
    return { error: NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 }) }
  }
  return { supabase, user }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'projectId obligatorio' }, { status: 400 })
    }
    const result = await getProjectForUser(projectId)
    if ('error' in result) return result.error
    const { supabase } = result

    let body: { name?: string; code?: string | null }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 })
    }

    const updates: { name?: string; code?: string | null; updated_at?: string } = {}
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) {
        return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 })
      }
      updates.name = name
    }
    if (body.code !== undefined) {
      updates.code = body.code === null || body.code === '' ? null : String(body.code).trim()
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }
    updates.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)

    if (error) {
      return NextResponse.json(
        { error: (error as { message: string }).message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: message || 'Error al actualizar el proyecto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'projectId obligatorio' }, { status: 400 })
    }
    const result = await getProjectForUser(projectId)
    if ('error' in result) return result.error
    const { supabase } = result

    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      return NextResponse.json(
        { error: (error as { message: string }).message },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: message || 'Error al eliminar el proyecto' },
      { status: 500 }
    )
  }
}
