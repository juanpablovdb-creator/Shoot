import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LocationsSection } from '@/components/locations/LocationsSection'

export const dynamic = 'force-dynamic'

export default async function LocationsPage({
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

  const { data: locations } = await supabase
    .from('locations')
    .select('id, name, address, city, created_at')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  const { data: sets } = await supabase
    .from('sets')
    .select('id, name, locations(id, name)')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  const { data: scenes } = await supabase
    .from('scenes')
    .select('set_id, scene_number_sort')
    .eq('project_id', projectId)
    .not('set_id', 'is', null)

  const firstSceneSortBySetId: Record<string, number> = {}
  for (const row of scenes ?? []) {
    if (row.set_id) {
      const current = firstSceneSortBySetId[row.set_id]
      const sort = row.scene_number_sort ?? 0
      if (current === undefined || sort < current) {
        firstSceneSortBySetId[row.set_id] = sort
      }
    }
  }

  const locationItems = (locations ?? []).map((loc) => ({
    id: loc.id,
    name: loc.name,
    type: 'location' as const,
    address: loc.address ?? null,
    city: loc.city ?? null,
    locationName: null as string | null,
    firstSceneSort: null as number | null,
    createdAt: loc.created_at ?? null,
  }))

  const setItems = (sets ?? []).map((s) => {
    const loc = Array.isArray(s.locations) ? s.locations[0] : s.locations
    return {
      id: s.id,
      name: s.name,
      type: 'set' as const,
      address: null as string | null,
      city: null as string | null,
      locationName: loc?.name ?? null,
      firstSceneSort: firstSceneSortBySetId[s.id] ?? null,
      createdAt: null as string | null,
    }
  })

  const unifiedItems = [...locationItems, ...setItems]

  return (
    <>
      <PageHeader
        title="Locaciones"
        description="Todas las locaciones del proyecto. Ordena por nombre (A–Z, Z–A) o por aparición en el guion."
      />
      <LocationsSection items={unifiedItems} />
    </>
  )
}
