import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCastFromBreakdown } from '@/lib/sync-cast'

/**
 * GET /api/projects/[projectId]/cast-members
 * Devuelve el cast desde la misma fuente que Elementos (breakdown_elements categoría "cast").
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

    const castMembers = await getCastFromBreakdown(supabase, projectId)

    return NextResponse.json(
      { castMembers },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Error al cargar cast', details: message },
      { status: 500 }
    )
  }
}
