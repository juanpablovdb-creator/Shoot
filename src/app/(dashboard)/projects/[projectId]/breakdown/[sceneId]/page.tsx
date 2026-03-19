import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCastFromBreakdown } from '@/lib/sync-cast'
import { SceneBreakdownSheet } from '@/components/breakdown/SceneBreakdownSheet'

export const dynamic = 'force-dynamic'

export default async function SceneBreakdownPage({
  params,
}: {
  params: Promise<{ projectId: string; sceneId: string }>
}) {
  const { projectId, sceneId } = await params
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: scene, error: sceneError } = await supabase
    .from('scenes')
    .select(
      'id, scene_number, scene_number_sort, int_ext, day_night, synopsis, page_eighths, has_stunts, has_sfx, has_vfx, set_id, set_name, script_page, script_day, unit, sequence, location, est_time, comments, scene_note, scene_from'
    )
    .eq('id', sceneId)
    .eq('project_id', projectId)
    .single()

  if (sceneError || !scene) notFound()

  const { data: sceneElements } = await supabase
    .from('scene_elements')
    .select('id, element_id, breakdown_elements(id, name, category)')
    .eq('scene_id', sceneId)

  const elementsList = (sceneElements ?? []) as Array<{
    id: string
    element_id: string
    breakdown_elements?: { id: string; name: string; category: string } | { id: string; name: string; category: string }[] | null
  }>

  const sceneRow = scene as Record<string, unknown>
  const opt = (key: string) => sceneRow[key] as string | number | null | undefined

  const castList = await getCastFromBreakdown(supabase, projectId)

  const castByBaseName: Record<string, { cast_number: number; character_name: string }> = {}
  for (const c of castList) {
    const base = (c.character_name ?? '')
      .trim()
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim()
      .toLowerCase()
    if (base) {
      castByBaseName[base] = {
        cast_number: c.cast_number,
        character_name: (c.character_name ?? '').trim(),
      }
    }
  }

  const castAppearanceCountsByName: Record<string, number> = {}
  for (const c of castList) {
    const base = (c.character_name ?? '')
      .trim()
      .replace(/\s*\(\d+\)\s*$/, '')
      .trim()
      .toLowerCase()
    if (base) castAppearanceCountsByName[base] = c.appearance_count ?? 0
  }

  const scriptPageRaw = opt('script_page')
  const scriptDayRaw = opt('script_day')

  const locationName = undefined

  return (
    <>
      <PageHeader
        title={`Escena ${scene.scene_number}`}
        description={`Desglose · ${project.name}`}
        actions={
          <Link
            href={`/projects/${projectId}/breakdown`}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
          >
            Volver al desglose
          </Link>
        }
      />
      <div className="mt-6">
        <SceneBreakdownSheet
          projectId={projectId}
          sceneId={sceneId}
          initialScene={{
            scene_number: scene.scene_number,
            scene_number_sort: scene.scene_number_sort ?? 0,
            int_ext: scene.int_ext,
            day_night: scene.day_night,
            set_name: scene.set_name ?? undefined,
            location_name: locationName,
            synopsis: scene.synopsis ?? undefined,
            page_eighths: scene.page_eighths,
            script_page: typeof scriptPageRaw === 'number' ? scriptPageRaw : undefined,
            script_day: typeof scriptDayRaw === 'number' ? scriptDayRaw : undefined,
            unit: opt('unit') != null ? String(opt('unit')) : undefined,
            sequence: opt('sequence') != null ? String(opt('sequence')) : undefined,
            location: opt('location') != null ? String(opt('location')) : undefined,
            est_time: opt('est_time') != null ? String(opt('est_time')) : undefined,
            comments: opt('comments') != null ? String(opt('comments')) : undefined,
            scene_note: opt('scene_note') != null ? String(opt('scene_note')) : undefined,
            scene_from: opt('scene_from') != null ? String(opt('scene_from')) : undefined,
          }}
          initialElements={elementsList.map((se) => {
            const be = Array.isArray(se.breakdown_elements)
              ? se.breakdown_elements[0]
              : se.breakdown_elements
            return {
              id: se.id,
              element_id: se.element_id,
              name: be?.name ?? '',
              category: be?.category ?? '',
            }
          })}
          castByBaseName={castByBaseName}
          castAppearanceCountsByName={castAppearanceCountsByName}
        />
      </div>
    </>
  )
}
