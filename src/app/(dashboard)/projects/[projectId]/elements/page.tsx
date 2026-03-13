import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BREAKDOWN_CATEGORIES } from '@/lib/constants/categories'
import type { BreakdownCategoryKey } from '@/types'

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

  const byCategory = (elements ?? []).reduce<Record<string, string[]>>(
    (acc, el) => {
      const cat = (el.category ?? '') as BreakdownCategoryKey
      const label = BREAKDOWN_CATEGORIES[cat]?.label ?? cat
      if (!acc[label]) acc[label] = []
      if (!acc[label].includes(el.name)) acc[label].push(el.name)
      return acc
    },
    {}
  )

  return (
    <>
      <PageHeader
        title="Elementos"
        description="Elementos del desglose por categoría"
      />
      <div className="mt-6 space-y-6">
        {Object.keys(byCategory).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay elementos aún. Importa un guion desde el Desglose para
            generarlos.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byCategory).map(([label, items]) => (
              <div
                key={label}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">{label}</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {items.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
