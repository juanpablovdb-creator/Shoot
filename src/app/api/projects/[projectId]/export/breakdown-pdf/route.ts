import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BREAKDOWN_CATEGORIES, BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'
import { createPdfContext, drawHeader, drawTextBlock, pdfToBuffer, safeFilename } from '@/lib/pdf-export'
import type { BreakdownCategoryKey } from '@/types'

function formatEighths(eighths: number): string {
  const e = Math.max(0, Math.round(Number(eighths)) || 0)
  const full = Math.floor(e / 8)
  const rem = e % 8
  if (full === 0) return rem === 0 ? '0' : `${rem}/8`
  return rem === 0 ? `${full}` : `${full} ${rem}/8`
}

/**
 * POST /api/projects/[projectId]/export/breakdown-pdf
 * Body: { categories?: string[] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    if (!projectId) return NextResponse.json({ error: 'projectId obligatorio' }, { status: 400 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

    let body: { categories?: string[] } = {}
    try {
      body = (await request.json()) as typeof body
    } catch {
      body = {}
    }
    const wanted = new Set<string>(
      (Array.isArray(body.categories) ? body.categories : [])
        .map((c) => String(c).trim())
        .filter(Boolean)
    )
    const includeAll = wanted.size === 0
    const validWanted = new Set<string>()
    for (const k of wanted) {
      if (BREAKDOWN_CATEGORY_KEYS.includes(k as BreakdownCategoryKey)) validWanted.add(k)
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
        scene_elements (
          breakdown_elements ( category, name )
        )
      `
      )
      .eq('project_id', projectId)
      .order('scene_number_sort', { ascending: true })

    const now = new Date()
    const downloadedAt = now.toLocaleString('es-CO')

    const ctx = await createPdfContext()
    drawHeader(ctx, {
      title: `Desglose — ${project.name ?? 'Proyecto'}`,
      subtitle: 'Exportación en PDF (escenas + elementos seleccionados)',
      metaRight: `Descargado: ${downloadedAt}`,
    })

    for (const s of scenes ?? []) {
      drawTextBlock(
        ctx,
        `Escena ${s.scene_number ?? ''} · ${s.int_ext ?? ''} · ${s.day_night ?? ''}`,
        { size: 10, bold: true }
      )
      drawTextBlock(
        ctx,
        `Set: ${String(s.set_name ?? '—')} · Págs: ${formatEighths(Number(s.page_eighths ?? 0))}`,
        { size: 9, color: [0.35, 0.35, 0.35] }
      )
      if (s.synopsis) {
        drawTextBlock(ctx, String(s.synopsis), { size: 9 })
      }

      const els = (s.scene_elements ?? []) as Array<{
        breakdown_elements?: { category?: string; name?: string } | null
      }>

      const grouped: Record<string, string[]> = {}
      for (const se of els) {
        const be = se.breakdown_elements
        const cat = String(be?.category ?? '').trim()
        const name = String(be?.name ?? '').trim()
        if (!cat || !name) continue
        if (!includeAll && !validWanted.has(cat)) continue
        if (!grouped[cat]) grouped[cat] = []
        if (!grouped[cat].includes(name)) grouped[cat].push(name)
      }

      const cats = Object.keys(grouped)
      for (const cat of cats) {
        const label =
          (BREAKDOWN_CATEGORIES as Record<string, { label: string }>)[cat]?.label ?? cat
        drawTextBlock(ctx, `${label}: ${grouped[cat]!.join(', ')}`, { size: 9, color: [0.35, 0.35, 0.35] })
      }

      // divider-ish spacing
      ctx.y -= 10
    }

    const pdf = await pdfToBuffer(ctx.pdf)

    const filename = `desglose-${safeFilename(project.name ?? 'proyecto')}.pdf`
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: 'Exportación fallida', details: message }, { status: 500 })
  }
}

