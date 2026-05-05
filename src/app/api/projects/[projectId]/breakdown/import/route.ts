import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createScenesFromParsedCore, type ParsedScene } from '@/lib/breakdown-import-core'
import { syncCastFromBreakdown } from '@/lib/sync-cast'

const FREE_PLAN_MAX_SCRIPTS_IN_PLAN = 3

/**
 * POST /api/projects/[projectId]/breakdown/import
 *
 * Importa escenas y elementos del desglose en el servidor (garantiza scene_elements y scene_cast).
 * Body: { scenes: ParsedScene[], scriptTotalPages?: number, saveScriptContent?: string }
 */
export async function POST(
  request: Request,
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

    // Plan Free: máximo 3 guiones "en tu plan" (proyectos con al menos 1 escena).
    // Solo bloquea cuando este proyecto aún no tiene escenas (o sea: cuando está "entrando" al plan).
    const { count: existingScenesCount } = await supabase
      .from('scenes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    if ((existingScenesCount ?? 0) === 0) {
      const { data: sceneProjects } = await supabase
        .from('scenes')
        .select('project_id, projects!inner(user_id)')
        .eq('projects.user_id', user.id)

      const distinctProjectIds = new Set<string>()
      for (const row of (sceneProjects ?? []) as Array<{ project_id: string }>) {
        if (row.project_id) distinctProjectIds.add(row.project_id)
      }

      if (distinctProjectIds.size >= FREE_PLAN_MAX_SCRIPTS_IN_PLAN) {
        return NextResponse.json(
          {
            error: `Límite del plan Free: máximo ${FREE_PLAN_MAX_SCRIPTS_IN_PLAN} guiones en tu plan.`,
            code: 'FREE_PLAN_LIMIT',
            limit: FREE_PLAN_MAX_SCRIPTS_IN_PLAN,
          },
          { status: 402 }
        )
      }
    }

    const body = await request.json() as {
      scenes?: unknown[]
      scriptTotalPages?: number
      saveScriptContent?: string
    }
    const scenes = Array.isArray(body.scenes) ? body.scenes as ParsedScene[] : []
    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren escenas en el body: { "scenes": [...] }' },
        { status: 400 }
      )
    }

    const result = await createScenesFromParsedCore(
      supabase,
      projectId,
      scenes,
      {
        scriptTotalPages: body.scriptTotalPages,
        saveScriptContent: body.saveScriptContent,
      }
    )

    await syncCastFromBreakdown(supabase, projectId)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[breakdown/import]', e)
    return NextResponse.json(
      { error: 'Error al importar desglose', details: message },
      { status: 500 }
    )
  }
}
