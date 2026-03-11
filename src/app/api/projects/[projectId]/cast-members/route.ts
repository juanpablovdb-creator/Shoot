import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/projects/[projectId]/cast-members
 * Devuelve el elenco del proyecto (para que la pestaña Elenco siempre pueda cargarlo).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'projectId obligatorio' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const { data: castMembers } = await supabase
      .from('cast_members')
      .select('id, character_name, cast_number, actor_name, availability_notes')
      .eq('project_id', projectId)
      .order('cast_number', { ascending: true })

    return NextResponse.json({ castMembers: castMembers ?? [] })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Error al cargar elenco', details: message },
      { status: 500 }
    )
  }
}
