import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StripboardView } from '@/components/stripboard/StripboardView'
import type { StripRowData } from '@/components/stripboard/StripRow'
import { syncCastFromBreakdown } from '@/lib/sync-cast'
import { sceneHasFxCategory } from '@/lib/scene-fx-from-elements'

export const dynamic = 'force-dynamic'

const outlineLinkClass =
  'inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/20 hover:bg-muted/50'

export default async function StripboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const PLACEHOLDER_CAST_NAME = 'Personaje (revisar)'
  const PLACEHOLDER_CAST_NAME_LOWER = PLACEHOLDER_CAST_NAME.toLowerCase()

  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, script_total_pages')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  await syncCastFromBreakdown(supabase, projectId)

  const [{ data: scenes }, { data: castMembers }] = await Promise.all([
    supabase
      .from('scenes')
      .select(
        `
      id,
      scene_number,
      scene_number_sort,
      int_ext,
      day_night,
      set_name,
      synopsis,
      page_eighths,
      has_stunts,
      has_sfx,
      has_vfx,
      sets ( id, name, locations ( id, name ) ),
      scene_cast ( cast_members ( id, character_name, cast_number ) ),
      scene_elements ( breakdown_elements ( id, name, category ) )
    `
      )
      .eq('project_id', projectId)
      .order('scene_number_sort', { ascending: true }),
    supabase
      .from('cast_members')
      .select('id, character_name, cast_number')
      .eq('project_id', projectId),
  ])

  const nameToCastNumber = new Map<string, number>()
  for (const cm of castMembers ?? []) {
    const name = (cm.character_name ?? '').trim()
    if (name && cm.cast_number != null) {
      const key = name.toLowerCase()
      if (key === PLACEHOLDER_CAST_NAME_LOWER) continue
      nameToCastNumber.set(key, cm.cast_number)
      const baseKey = key.replace(/\s*\(\d+\)\s*$/, '').trim()
      if (baseKey && baseKey !== key) nameToCastNumber.set(baseKey, cm.cast_number)
    }
  }

  const strips: StripRowData[] = (scenes ?? []).map((scene) => {
    const setsRow = scene.sets as { name?: string; locations?: { name?: string } } | null
    const setLocationName =
      setsRow && typeof setsRow === 'object' && 'name' in setsRow
        ? setsRow.name
        : undefined
    const locations = setsRow && typeof setsRow === 'object' && 'locations' in setsRow ? setsRow.locations : undefined
    const specificLocation =
      locations && typeof locations === 'object' && locations !== null && 'name' in locations
        ? (locations as { name?: string }).name
        : Array.isArray(locations) && locations[0] && typeof locations[0] === 'object' && 'name' in locations[0]
          ? (locations[0] as { name?: string }).name
          : null

    const sceneCastRows = scene.scene_cast ?? []
    const allCast = sceneCastRows.flatMap(
      (c: {
        cast_members?:
          | { cast_number?: number; character_name?: string }
          | { cast_number?: number; character_name?: string }[]
      }) => {
        const m = c.cast_members
        if (Array.isArray(m)) return m.map((x) => ({ cast_number: x?.cast_number, character_name: x?.character_name }))
        return m?.cast_number != null ? [{ cast_number: m.cast_number, character_name: m.character_name }] : []
      }
    )
    const castNumbersAll = allCast
      .filter((x) => (x.character_name ?? '').trim().toLowerCase() !== PLACEHOLDER_CAST_NAME_LOWER)
      .map((x) => x.cast_number)
      .filter((n): n is number => n != null)

    let castNumbers = castNumbersAll.filter((n) => n < 100)
    const stuntNumbers = castNumbersAll.filter((n) => n >= 100)

    const sceneElsRaw = scene.scene_elements ?? []
    const sceneEls = Array.isArray(sceneElsRaw) ? sceneElsRaw : []
    const getBe = (se: Record<string, unknown>) =>
      (se.breakdown_elements ?? se.breakdown_element) as { name?: string; category?: string } | null | undefined

    const categoriesInScene = new Set(
      sceneEls
        .map(getBe)
        .map((be) => String(be?.category ?? '').trim().toLowerCase())
        .filter(Boolean)
    )
    const hasExtras = categoriesInScene.has('extras')
    const hasBits = categoriesInScene.has('figuracion')
    const castFromElements = sceneEls
      .map(getBe)
      .filter((be): be is { name: string; category: string } => be?.category === 'cast' && !!be?.name)
      .map((be) => be.name)
      .filter((name) => name.trim().toLowerCase() !== PLACEHOLDER_CAST_NAME_LOWER)
    const castNames = castFromElements.length > 0 ? castFromElements : undefined

    if (castNumbers.length === 0 && castFromElements.length > 0) {
      const seen = new Set<number>()
      castNumbers = castFromElements
        .map((name) => {
          const key = name.trim().toLowerCase()
          return nameToCastNumber.get(key) ?? nameToCastNumber.get(key.replace(/\s*\(\d+\)\s*$/, '').trim())
        })
        .filter((n): n is number => n != null && n < 100 && !seen.has(n) && (seen.add(n), true))
    }

    return {
      id: scene.id,
      scene_number: scene.scene_number,
      scene_number_sort: scene.scene_number_sort,
      int_ext: scene.int_ext,
      day_night: scene.day_night,
      set_name: scene.set_name ?? setLocationName ?? null,
      setLocationName: setLocationName ?? undefined,
      specificLocation: specificLocation ?? null,
      synopsis: scene.synopsis ?? null,
      page_eighths: scene.page_eighths,
      has_stunts: sceneHasFxCategory(scene.scene_elements, 'stunts', scene.has_stunts),
      has_sfx: sceneHasFxCategory(scene.scene_elements, 'spfx', scene.has_sfx),
      has_vfx: sceneHasFxCategory(scene.scene_elements, 'vfx', scene.has_vfx),
      has_extras: hasExtras,
      has_bits: hasBits,
      castNumbers,
      stuntNumbers,
      castNames,
    }
  })

  return (
    <>
      <PageHeader
        title="Stripboard"
        description="Franjas por escena (INT/EXT, DÍA/NOCHE). Clic en una fila abre el desglose de esa escena."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/breakdown`}
              className={outlineLinkClass}
            >
              Desglose
            </Link>
            <Link
              href={`/projects/${projectId}/elements`}
              className={outlineLinkClass}
            >
              Elementos
            </Link>
          </div>
        }
      />
      <div className="mt-6">
        <StripboardView
          strips={strips}
          projectId={projectId}
          scriptTotalPages={project.script_total_pages ?? undefined}
        />
      </div>
    </>
  )
}
