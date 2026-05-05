'use client'

import { useRouter } from 'next/navigation'
import { SceneCard } from './SceneCard'
import { ImportScriptDialog } from './ImportScriptDialog'
import { ScriptSection } from './ScriptSection'
import { buttonVariants } from '@/components/ui/button'
import { BREAKDOWN_CATEGORIES } from '@/lib/constants/categories'
import { sceneHasFxCategory } from '@/lib/scene-fx-from-elements'
import { cn } from '@/lib/utils'
import { Download, Layers, Plus } from 'lucide-react'
import Link from 'next/link'

interface SceneRow {
  id: string
  scene_number: string
  scene_number_sort: number
  int_ext: 'INT' | 'EXT'
  day_night: string
  synopsis: string | null
  page_eighths: number
  has_stunts: boolean
  has_sfx: boolean
  has_vfx: boolean
  sets?:
    | {
        name: string
        locations?: { name: string } | Array<{ name: string }> | null
      }
    | Array<{
        name: string
        locations?: { name: string } | Array<{ name: string }> | null
      }>
    | null
  scene_cast?: Array<{
    cast_members: { cast_number: number; character_name: string | null } | null
  }>
  scene_elements?: Array<{
    breakdown_elements: { name: string; category: string } | null
  }>
}

/** Nombre base (lowercase) → número y nombre para mostrar en cards (desde getCastFromBreakdown). */
export type CastByBaseName = Record<
  string,
  { cast_number: number; character_name: string }
>

export interface BreakdownSheetProps {
  projectId: string
  projectName: string
  initialScriptContent?: string
  initialScriptFilePath?: string | null
  initialScriptFileName?: string | null
  initialScenes: SceneRow[]
  /** Nombre base (lowercase) → cantidad de apariciones (para mostrar en cada escena). */
  castAppearanceCountsByName?: Record<string, number>
  /** Nombre base (lowercase) → cast_number y character_name para derivar cast en cards desde scene_elements. */
  castByBaseName?: CastByBaseName
}

function baseCharacterName(name: string): string {
  return (name ?? '')
    .trim()
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim()
    .toLowerCase()
}

export function BreakdownSheet({
  projectId,
  projectName,
  initialScriptContent = '',
  initialScriptFilePath = null,
  initialScriptFileName = null,
  initialScenes,
  castAppearanceCountsByName,
  castByBaseName = {},
}: BreakdownSheetProps) {
  const router = useRouter()
  const stuntNumbers = (row: SceneRow) =>
    (row.scene_cast ?? []).filter(
      (c) => c.cast_members && c.cast_members.cast_number >= 100
    ).map((c) => c.cast_members!.cast_number)

  const categoryCounts: Record<string, number> = {}
  for (const scene of initialScenes) {
    for (const e of scene.scene_elements ?? []) {
      const cat = e.breakdown_elements?.category
      if (cat) {
        const label = BREAKDOWN_CATEGORIES[cat as keyof typeof BREAKDOWN_CATEGORIES]?.label ?? cat
        categoryCounts[label] = (categoryCounts[label] ?? 0) + 1
      }
    }
  }
  const hasElements = Object.keys(categoryCounts).length > 0

  return (
    <div className="space-y-6">
      <ScriptSection
        projectId={projectId}
        initialScriptContent={initialScriptContent ?? ''}
        initialScriptFilePath={initialScriptFilePath}
        initialScriptFileName={initialScriptFileName}
        initialScenesCount={initialScenes.length}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {initialScenes.length} escena{initialScenes.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${projectId}/elements`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Elementos
          </Link>
          <Link
            href={`/projects/${projectId}/cast`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Cast
          </Link>
          <Link
            href={`/projects/${projectId}/stripboard`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Stripboard
          </Link>
          <Link
            href={`/projects/${projectId}/locations`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            Sets
          </Link>
          <ImportScriptDialog projectId={projectId} />
          <a
            href={`/api/projects/${projectId}/export/breakdown-csv`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            download
          >
            <Download className="size-4" />
            Desglose CSV
          </a>
          <a
            href={`/api/projects/${projectId}/export/cast-csv`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            download
          >
            <Download className="size-4" />
            Cast CSV
          </a>
          <Link
            href={`/projects/${projectId}/breakdown/new`}
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            <Plus className="size-4" />
            Añadir escena
          </Link>
        </div>
      </div>

      {initialScenes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <p className="mb-2 font-medium text-foreground">No hay escenas en el desglose.</p>
          <p className="text-sm text-muted-foreground">
            Añade escenas manualmente o importa un guion para detectarlas
            automáticamente.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <ImportScriptDialog projectId={projectId} triggerClassName="inline-flex" />
            <Link
              href={`/projects/${projectId}/breakdown/new`}
              className={cn(buttonVariants(), 'inline-flex')}
            >
              <Plus className="size-4" />
              Añadir primera escena
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {hasElements && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Layers className="size-4" />
                Elementos por categoría
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, count]) => (
                    <span
                      key={label}
                      className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {label} ({count})
                    </span>
                  ))}
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {initialScenes.map((scene) => {
            const setRow = Array.isArray(scene.sets) ? scene.sets[0] : scene.sets
            const loc = setRow?.locations
            const locationName =
              loc && typeof loc === 'object' && !Array.isArray(loc)
                ? loc.name
                : Array.isArray(loc) && loc[0]
                  ? loc[0].name
                  : undefined
            return (
            <SceneCard
              key={scene.id}
              sceneNumber={scene.scene_number}
              intExt={scene.int_ext}
              dayNight={scene.day_night as 'DÍA' | 'NOCHE' | 'AMANECER' | 'ATARDECER'}
              setLocationName={setRow?.name}
              locationName={locationName}
              synopsis={scene.synopsis}
              pageEighths={scene.page_eighths}
              hasStunts={sceneHasFxCategory(scene.scene_elements, 'stunts', scene.has_stunts)}
              hasSfx={sceneHasFxCategory(scene.scene_elements, 'spfx', scene.has_sfx)}
              hasVfx={sceneHasFxCategory(scene.scene_elements, 'vfx', scene.has_vfx)}
              castEntries={(() => {
                const fromElements = (scene.scene_elements ?? [])
                  .map((e) => e.breakdown_elements)
                  .filter(
                    (be): be is { name: string; category: string } =>
                      be != null && be.category === 'cast' && !!be.name?.trim()
                  )
                const seen = new Set<string>()
                return fromElements
                  .map((be) => {
                    const name = be.name.trim()
                    const base = baseCharacterName(name)
                    const info = castByBaseName[base]
                    const cast_number = info?.cast_number ?? 0
                    const character_name = info?.character_name ?? name
                    if (seen.has(base)) return null
                    seen.add(base)
                    return { cast_number, character_name }
                  })
                  .filter((e): e is { cast_number: number; character_name: string } => e != null)
              })()}
              castAppearanceCountsByName={castAppearanceCountsByName}
              stuntNumbers={stuntNumbers(scene)}
              elements={
                scene.scene_elements?.map((e) => ({
                  breakdown_elements: e.breakdown_elements
                    ? {
                        name: e.breakdown_elements.name,
                        category: e.breakdown_elements
                          .category as import('@/types').BreakdownCategoryKey,
                      }
                    : null,
                })) ?? []
              }
              onClick={() => {
                if (scene?.id) {
                  router.push(`/projects/${projectId}/breakdown/${scene.id}`)
                }
              }}
            />
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
