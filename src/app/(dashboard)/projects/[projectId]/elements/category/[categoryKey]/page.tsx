import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/shared/PageHeader'
import { createClient } from '@/lib/supabase/server'
import { BREAKDOWN_CATEGORIES, BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import type { BreakdownCategoryKey } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ElementsCategoryPage({
  params,
}: {
  params: Promise<{ projectId: string; categoryKey: string }>
}) {
  const { projectId, categoryKey: rawKey } = await params
  if (!BREAKDOWN_CATEGORY_KEYS.includes(rawKey as BreakdownCategoryKey)) {
    notFound()
  }
  const categoryKey = rawKey as BreakdownCategoryKey

  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: projectEls } = await supabase
    .from('breakdown_elements')
    .select('id, name')
    .eq('project_id', projectId)
    .eq('category', categoryKey)

  const elementIds = (projectEls ?? []).map((e) => e.id)
  const nameById = new Map((projectEls ?? []).map((e) => [e.id, e.name]))

  let sceneRows: { scene_id: string; element_id: string }[] = []
  if (elementIds.length > 0) {
    const chunk = 80
    for (let i = 0; i < elementIds.length; i += chunk) {
      const part = elementIds.slice(i, i + chunk)
      const { data: se } = await supabase
        .from('scene_elements')
        .select('scene_id, element_id')
        .in('element_id', part)
      sceneRows = sceneRows.concat(se ?? [])
    }
  }

  const sceneIds = [...new Set(sceneRows.map((r) => r.scene_id))]
  let scenes: Array<{
    id: string
    scene_number: string
    scene_number_sort: number
    synopsis: string | null
    set_name: string | null
  }> = []
  if (sceneIds.length > 0) {
    const { data } = await supabase
      .from('scenes')
      .select('id, scene_number, scene_number_sort, synopsis, set_name')
      .eq('project_id', projectId)
      .in('id', sceneIds)
      .order('scene_number_sort', { ascending: true })
    scenes = data ?? []
  }

  const bySceneId: Record<string, string[]> = {}
  for (const r of sceneRows) {
    const name = nameById.get(r.element_id)
    if (!name) continue
    if (!bySceneId[r.scene_id]) bySceneId[r.scene_id] = []
    if (!bySceneId[r.scene_id].includes(name)) bySceneId[r.scene_id].push(name)
  }

  const label = BREAKDOWN_CATEGORIES[categoryKey]?.label ?? categoryKey
  const list = scenes.filter((s) => bySceneId[s.id]?.length)

  return (
    <>
      <PageHeader
        title={`Elementos: ${label}`}
        description="Escenas donde aparece al menos un elemento de esta categoría en el desglose."
        actions={
          <Link
            href={`/projects/${projectId}/elements`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Volver a Elementos
          </Link>
        }
      />
      <div className="mt-6 space-y-3">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay elementos de esta categoría en el proyecto. Importa un guion o añádelos desde el desglose
            escena por escena.
          </p>
        ) : (
          <ul className="space-y-2">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/projects/${projectId}/breakdown/${s.id}`}
                  className="block rounded-lg border border-border bg-card p-3 text-sm shadow-sm transition-colors hover:bg-muted/40"
                >
                  <span className="font-semibold text-foreground">
                    Escena {s.scene_number}
                  </span>
                  {s.set_name ? (
                    <span className="ml-2 text-muted-foreground">· {s.set_name}</span>
                  ) : null}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {(bySceneId[s.id] ?? []).join(', ')}
                  </div>
                  {s.synopsis ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.synopsis}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
