import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  BREAKDOWN_CATEGORIES,
} from '@/lib/constants/categories'
import { getCastFromBreakdown } from '@/lib/sync-cast'
import type { BreakdownCategoryKey } from '@/types'
import { ElementsCategoriesGrid, type ElementsCategoryCard } from '@/components/elements/ElementsCategoriesGrid'

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

  const { data: sets } = await supabase
    .from('sets')
    .select('id, name')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  const castItems =
    castByAppearance.length > 0
      ? castByAppearance.map((c) => `${c.cast_number}. ${c.character_name}`)
      : []
  const setItems = (sets ?? []).map((s) => s.name).filter(Boolean)

  const allCategoryKeys = (Object.keys(BREAKDOWN_CATEGORIES) as BreakdownCategoryKey[]).filter(
    (k) => k !== 'cast'
  )
  const allItems: ElementsCategoryCard[] = [
    {
      key: 'cast',
      label: 'Cast',
      href: `/projects/${projectId}/cast`,
      items: castItems,
    },
    {
      key: 'sets',
      label: 'Sets',
      href: `/projects/${projectId}/locations`,
      items: setItems,
    },
    ...allCategoryKeys.map((key) => {
      const raw = byCategoryKey[key] ?? []
      const items =
        key === 'stunts'
          ? raw.map((name, i) => `${101 + i}. ${name}`)
          : key === 'figuracion'
            ? raw.map((name, i) => `${200 + i}. ${name}`)
            : raw
      return {
        key,
        label: BREAKDOWN_CATEGORIES[key].label,
        href: `/projects/${projectId}/elements/category/${key}`,
        items,
      }
    }),
  ]

  return (
    <>
      <PageHeader
        title="Elementos"
        description="Todas las categorías del desglose."
      />
      <div className="mt-6">
        <ElementsCategoriesGrid items={allItems} storageKey={`elements-order:${projectId}`} />
      </div>
    </>
  )
}
