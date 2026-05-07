import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCastFromBreakdown, syncCastFromBreakdown } from '@/lib/sync-cast'

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * GET /api/projects/[projectId]/export/cast-csv
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
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    await syncCastFromBreakdown(supabase, projectId)
    const castMembers = await getCastFromBreakdown(supabase, projectId)

    const rows: string[][] = [
      ['#', 'Personaje', 'Apariciones', 'Escenas', 'Actor / notas (si existe en BD)'],
    ]

    for (const c of castMembers) {
      rows.push([
        String(c.cast_number),
        c.character_name ?? '',
        String(c.appearance_count ?? ''),
        (c.appearance_scene_numbers ?? []).join(', '),
        c.actor_name ?? c.notes ?? '',
      ])
    }

    const csv = rows.map((r) => r.map((c) => csvCell(c)).join(',')).join('\r\n')
    const filename = `cast-${(project.name ?? 'proyecto').replace(/[^\w\-]+/g, '_').slice(0, 40)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Exportación fallida', details: message }, { status: 500 })
  }
}
