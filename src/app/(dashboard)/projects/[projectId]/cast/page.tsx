import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CastSection } from '@/components/cast/CastSection'
import { syncCastFromBreakdown } from '@/lib/sync-cast'

export const dynamic = 'force-dynamic'

export default async function CastPage({
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

  let { data: castMembers } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number, actor_name, availability_notes')
    .eq('project_id', projectId)
    .order('cast_number', { ascending: true })

  // Si no hay elenco pero sí hay personajes en el desglose, sincronizar una vez (sin que el usuario tenga que pulsar el botón)
  if ((castMembers ?? []).length === 0) {
    const { data: castElements } = await supabase
      .from('breakdown_elements')
      .select('id')
      .eq('project_id', projectId)
      .eq('category', 'cast')
      .limit(1)
    if (castElements?.length) {
      await syncCastFromBreakdown(supabase, projectId)
      const result = await supabase
        .from('cast_members')
        .select('id, character_name, cast_number, actor_name, availability_notes')
        .eq('project_id', projectId)
        .order('cast_number', { ascending: true })
      castMembers = result.data ?? []
    }
  }

  return (
    <>
      <PageHeader
        title="Elenco"
        description="Personajes del proyecto (cast). El número es por orden de apariciones (1 = el que más sale). Se sincronizan desde Elementos > Cast."
      />
      <CastSection
        projectId={projectId}
        initialCastMembers={castMembers ?? []}
      />
    </>
  )
}
