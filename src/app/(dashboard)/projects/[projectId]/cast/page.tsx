import { unstable_noStore } from 'next/cache'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CastSection } from '@/components/cast/CastSection'
import { getCastFromBreakdown, syncCastFromBreakdown } from '@/lib/sync-cast'

export const dynamic = 'force-dynamic'

export default async function CastPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  unstable_noStore()
  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  // Misma fuente que Elementos: cast desde breakdown_elements (siempre lo que ves en Elementos)
  const castMembers = await getCastFromBreakdown(supabase, projectId)

  // Mantener cast_members y scene_cast en sync para stripboard y demás
  if (castMembers.length > 0) {
    await syncCastFromBreakdown(supabase, projectId)
  }

  return (
    <>
      <PageHeader
        title="Cast"
        description="Personajes del proyecto (mismo listado que en Elementos). El número es por orden de apariciones (1 = el que más sale)."
      />
      <CastSection
        projectId={projectId}
        initialCastMembers={castMembers}
      />
    </>
  )
}
