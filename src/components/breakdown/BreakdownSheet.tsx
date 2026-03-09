'use client'

import { SceneCard } from './SceneCard'
import { ImportScriptDialog } from './ImportScriptDialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
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
  scene_cast?: Array<{ cast_members: { cast_number: number } | null }>
  scene_elements?: Array<{
    breakdown_elements: { name: string; category: string } | null
  }>
}

export interface BreakdownSheetProps {
  projectId: string
  projectName: string
  initialScenes: SceneRow[]
}

export function BreakdownSheet({
  projectId,
  projectName,
  initialScenes,
}: BreakdownSheetProps) {
  const castNumbers = (row: SceneRow) =>
    (row.scene_cast ?? [])
      .map((c) => c.cast_members?.cast_number)
      .filter((n): n is number => n != null)
  const stuntNumbers = (row: SceneRow) =>
    (row.scene_cast ?? []).filter(
      (c) => c.cast_members && c.cast_members.cast_number >= 100
    ).map((c) => c.cast_members!.cast_number)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {initialScenes.length} escena{initialScenes.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <ImportScriptDialog projectId={projectId} />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              hasStunts={scene.has_stunts}
              hasSfx={scene.has_sfx}
              hasVfx={scene.has_vfx}
              castNumbers={castNumbers(scene)}
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
                window.location.href = `/projects/${projectId}/breakdown/${scene.id}`
              }}
            />
            )
          })}
        </div>
      )}
    </div>
  )
}
