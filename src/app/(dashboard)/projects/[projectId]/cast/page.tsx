import { unstable_noStore } from 'next/cache'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CastSection } from '@/components/cast/CastSection'
import { getCastFromBreakdown, syncCastFromBreakdown } from '@/lib/sync-cast'

export const dynamic = 'force-dynamic'

const outlineLinkClass =
  'inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/20 hover:bg-muted/50'
const solidLinkClass =
  'inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'

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

  await syncCastFromBreakdown(supabase, projectId)
  const castMembers = await getCastFromBreakdown(supabase, projectId)

  return (
    <>
      <PageHeader
        title="Cast"
        description="Personajes del proyecto (mismo listado que en Elementos). El número es por orden de apariciones (1 = el que más sale)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${projectId}/breakdown`}
              className={outlineLinkClass}
            >
              Desglose
            </Link>
            <a
              href={`/api/projects/${projectId}/export/cast-csv`}
              className={solidLinkClass}
              download
            >
              Exportar cast CSV
            </a>
          </div>
        }
      />
      <CastSection
        projectId={projectId}
        initialCastMembers={castMembers}
      />
    </>
  )
}
