import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * GET /api/projects/[projectId]/export/breakdown-csv
 * CSV del desglose (escenas + elementos) para Excel / Numbers.
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

    const { data: scenes } = await supabase
      .from('scenes')
      .select(
        `
        scene_number,
        int_ext,
        day_night,
        synopsis,
        page_eighths,
        set_name,
        has_stunts,
        has_sfx,
        has_vfx,
        scene_elements (
          breakdown_elements ( category, name )
        )
      `
      )
      .eq('project_id', projectId)
      .order('scene_number_sort', { ascending: true })

    const rows: string[][] = [
      [
        'Escena',
        'INT/EXT',
        'Día/Noche',
        'Set / cabecera',
        'Sinopsis',
        'Octavos',
        'Stunts',
        'SFX',
        'VFX',
        'Elementos (categoría: nombre)',
      ],
    ]

    for (const scene of scenes ?? []) {
      const els = (scene.scene_elements ?? []) as Array<{
        breakdown_elements?: { category?: string; name?: string } | null
      }>
      const elStr = els
        .map((se) => {
          const be = se.breakdown_elements
          if (!be?.name) return null
          return `${be.category ?? '?'}: ${be.name}`
        })
        .filter(Boolean)
        .join('; ')

      rows.push([
        String(scene.scene_number ?? ''),
        String(scene.int_ext ?? ''),
        String(scene.day_night ?? ''),
        String(scene.set_name ?? ''),
        String(scene.synopsis ?? ''),
        String(scene.page_eighths ?? ''),
        scene.has_stunts ? 'sí' : 'no',
        scene.has_sfx ? 'sí' : 'no',
        scene.has_vfx ? 'sí' : 'no',
        elStr,
      ])
    }

    const csv = rows.map((r) => r.map((c) => csvCell(c)).join(',')).join('\r\n')
    const filename = `desglose-${(project.name ?? 'proyecto').replace(/[^\w\-]+/g, '_').slice(0, 40)}.csv`

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
