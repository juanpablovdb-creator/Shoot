import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { syncCastFromBreakdown } from '@/lib/sync-cast'

/**
 * POST /api/projects/[projectId]/sync-cast
 *
 * Sincroniza el elenco (cast_members y scene_cast) desde los elementos del desglose
 * que tienen categoría "cast". Crea cast_members que falten y enlaza escenas con scene_cast.
 */
export async function POST(
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

    const { castMembers, synced } = await syncCastFromBreakdown(supabase, projectId)
    const castCount = castMembers.length

    revalidatePath(`/projects/${projectId}/cast`)
    return NextResponse.json({
      ok: true,
      synced,
      castCount,
      castMembers,
      message:
        castCount > 0
          ? `Elenco sincronizado: ${castCount} personaje${castCount !== 1 ? 's' : ''}, ${synced} enlaces escena–personaje añadidos.`
          : 'No hay personajes en el desglose (elementos con categoría Cast). Importa el guion y usa "Rehacer desglose con IA".',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Error al sincronizar elenco', details: message },
      { status: 500 }
    )
  }
}
