import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { StripboardView } from '@/components/stripboard/StripboardView'
import type { StripRowData } from '@/components/stripboard/StripRow'

export const dynamic = 'force-dynamic'

export default async function StripboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: scenes } = await supabase
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
    .order('scene_number_sort', { ascending: true })

  const strips: StripRowData[] = (scenes ?? []).map((scene) => {
    const setsRow = scene.sets as { name?: string; locations?: { name?: string } } | null
    const setLocationName =
      setsRow && typeof setsRow === 'object' && 'name' in setsRow
        ? setsRow.name
        : undefined
    const castNumbers = (scene.scene_cast ?? [])
      .map((c: { cast_members?: { cast_number?: number } }) => c.cast_members?.cast_number)
      .filter((n): n is number => n != null)
    const sceneElsRaw = scene.scene_elements ?? []
    const sceneEls = Array.isArray(sceneElsRaw) ? sceneElsRaw : []
    const getBe = (se: Record<string, unknown>) =>
      (se.breakdown_elements ?? se.breakdown_element) as { name?: string; category?: string } | null | undefined
    const castFromElements = sceneEls
      .map(getBe)
      .filter((be): be is { name: string; category: string } => be?.category === 'cast' && !!be?.name)
      .map((be) => be.name)
    const castNames = castFromElements.length > 0 ? castFromElements : undefined

    return {
      id: scene.id,
      scene_number: scene.scene_number,
      scene_number_sort: scene.scene_number_sort,
      int_ext: scene.int_ext,
      day_night: scene.day_night,
      set_name: scene.set_name ?? setLocationName ?? null,
      setLocationName: setLocationName ?? undefined,
      synopsis: scene.synopsis ?? null,
      page_eighths: scene.page_eighths,
      has_stunts: scene.has_stunts,
      has_sfx: scene.has_sfx,
      has_vfx: scene.has_vfx,
      castNumbers,
      castNames,
    }
  })

  return (
    <>
      <PageHeader
        title="Stripboard"
        description="Franjas por escena (INT/EXT, DÍA/NOCHE). Ordena por escena o por set."
      />
      <div className="mt-6">
        <StripboardView strips={strips} projectId={projectId} />
      </div>
    </>
  )
}
