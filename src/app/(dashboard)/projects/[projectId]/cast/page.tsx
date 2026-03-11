import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CastSection } from '@/components/cast/CastSection'

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

  const { data: castMembers } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number, actor_name, availability_notes')
    .eq('project_id', projectId)
    .order('cast_number', { ascending: true })

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
