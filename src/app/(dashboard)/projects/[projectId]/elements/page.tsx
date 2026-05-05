import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  BREAKDOWN_CATEGORIES,
  BREAKDOWN_CATEGORY_ORDER,
} from '@/lib/constants/categories'
import { getCastFromBreakdown } from '@/lib/sync-cast'
import type { BreakdownCategoryKey } from '@/types'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ElementsPage({
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

  const { data: elements } = await supabase
    .from('breakdown_elements')
    .select('id, name, category')
    .eq('project_id', projectId)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const byCategoryKey = (elements ?? []).reduce<Record<string, string[]>>((acc, el) => {
    const cat = (el.category ?? '') as string
    if (!acc[cat]) acc[cat] = []
    if (!acc[cat].includes(el.name)) acc[cat].push(el.name)
    return acc
  }, {})

  const castByAppearance = await getCastFromBreakdown(supabase, projectId)

  return (
    <>
      <PageHeader
        title="Elementos"
        description="Todas las categorías de desglose. Las que aún no tienen ítems aparecen vacías: no es WIP, simplemente el guion no los ha detectado o aún no los añadiste."
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/projects/${projectId}/breakdown`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Desglose
        </Link>
        <Link
          href={`/projects/${projectId}/cast`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Cast
        </Link>
        <Link
          href={`/projects/${projectId}/stripboard`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Stripboard
        </Link>
        <Link
          href={`/projects/${projectId}/locations`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Sets
        </Link>
        <a
          href={`/api/projects/${projectId}/export/breakdown-csv`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Exportar desglose CSV
        </a>
        <a
          href={`/api/projects/${projectId}/export/cast-csv`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Exportar cast CSV
        </a>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BREAKDOWN_CATEGORY_ORDER.map((key) => {
          const label = BREAKDOWN_CATEGORIES[key as BreakdownCategoryKey].label
          const items =
            key === 'cast' && castByAppearance.length > 0
              ? castByAppearance.map((c) => `${c.cast_number}. ${c.character_name}`)
              : (byCategoryKey[key] ?? [])
          return (
            <div key={key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {items.length} ítem{items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <Link
                href={`/projects/${projectId}/elements/category/${key}`}
                className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Ver en qué escenas aparece →
              </Link>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                {items.length === 0 ? (
                  <li className="italic text-xs">Sin elementos en esta categoría.</li>
                ) : (
                  items.map((name, i) => (
                    <li key={`${key}-${i}-${name.slice(0, 40)}`}>{name}</li>
                  ))
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </>
  )
}
