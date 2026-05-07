import { PageHeader } from '@/components/shared/PageHeader'
import { BreakdownSheet } from '@/components/breakdown/BreakdownSheet'
import type { BreakdownSheetProps } from '@/components/breakdown/BreakdownSheet'
import { ProductionComplexityBanner } from '@/components/breakdown/ProductionComplexityBanner'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { getCastFromBreakdown, syncCastFromBreakdown } from '@/lib/sync-cast'
import { countScenesByFxCategories } from '@/lib/scene-fx-from-elements'

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, script_content, script_file_path, script_file_name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  await syncCastFromBreakdown(supabase, projectId)

  const [scenesResult, castList] = await Promise.all([
    supabase
      .from('scenes')
      .select(
        `
        id,
        scene_number,
        scene_number_sort,
        int_ext,
        day_night,
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
    getCastFromBreakdown(supabase, projectId),
  ])

  const scenes = scenesResult.data ?? []
  const { stuntScenes, sfxScenes, vfxScenes } = countScenesByFxCategories(scenes)
  const avgNonCastElementsPerScene = scenes.length
    ? Math.round(
        (scenes.reduce((acc, s) => {
          const els = (s.scene_elements ?? []) as Array<{
            breakdown_elements?: { category?: string } | null
          }>
          const nonCast = els.filter((e) => e.breakdown_elements?.category !== 'cast').length
          return acc + nonCast
        }, 0) / scenes.length) * 10
      ) / 10
    : 0

  const complexityLevel =
    avgNonCastElementsPerScene > 8 ? 'Alto' : avgNonCastElementsPerScene >= 3 ? 'Medio' : 'Bajo'
  // Por nombre base (ej. "Abuelo" y "Abuelo (74)" → mismo personaje) para mostrar apariciones en el desglose
  const castAppearanceCountsByName: Record<string, number> = {}
  const castByBaseName: Record<string, { cast_number: number; character_name: string }> = {}
  for (const c of castList) {
    const base = (c.character_name ?? '').trim().replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase()
    if (base) {
      castAppearanceCountsByName[base] = c.appearance_count ?? 0
      castByBaseName[base] = {
        cast_number: c.cast_number,
        character_name: (c.character_name ?? '').trim(),
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Desglose"
        description="Escenas y elementos del proyecto. Exportaciones: CSV del desglose y del cast enlazados abajo."
      />
      <div className="mt-4">
        <ProductionComplexityBanner
          totalScenes={scenes.length}
          stuntScenes={stuntScenes}
          sfxScenes={sfxScenes}
          vfxScenes={vfxScenes}
          complexityLevel={complexityLevel}
          avgNonCastElementsPerScene={avgNonCastElementsPerScene}
        />
      </div>
      <div className="mt-6">
        <BreakdownSheet
          projectId={projectId}
          projectName={project.name}
          initialScriptContent={project.script_content ?? ''}
          initialScriptFilePath={project.script_file_path ?? null}
          initialScriptFileName={project.script_file_name ?? null}
          initialScenes={scenes as unknown as BreakdownSheetProps['initialScenes']}
          castAppearanceCountsByName={castAppearanceCountsByName}
          castByBaseName={castByBaseName}
        />
      </div>
    </>
  )
}
