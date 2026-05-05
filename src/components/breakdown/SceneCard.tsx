'use client'

import { getStripColor } from '@/lib/constants/strip-colors'
import { STRIP_COLORS } from '@/lib/constants/strip-colors'
import {
  BREAKDOWN_CATEGORIES,
  BREAKDOWN_CATEGORY_ORDER,
} from '@/lib/constants/categories'
import { formatEighthsOctavosOnly } from '@/lib/utils/eighths'
import type { IntExt, DayNight } from '@/types'
import { cn } from '@/lib/utils'
import type { BreakdownCategoryKey } from '@/types'

interface SceneElementItem {
  breakdown_elements?: { name: string; category: BreakdownCategoryKey } | null
}

interface SceneCardProps {
  sceneNumber: string
  intExt: IntExt
  dayNight: DayNight
  setLocationName?: string
  locationName?: string
  synopsis?: string | null
  pageEighths: number
  hasStunts: boolean
  hasSfx: boolean
  hasVfx: boolean
  /** @deprecated Use castEntries + castAppearanceCountsByName */
  castNumbers?: number[]
  /** Cast en la escena (número y nombre) para mostrar con cantidad de apariciones. */
  castEntries?: { cast_number: number; character_name: string }[]
  /** Nombre base (lowercase) → cantidad de apariciones. */
  castAppearanceCountsByName?: Record<string, number>
  stuntNumbers?: number[]
  elements?: SceneElementItem[]
  isSelected?: boolean
  onClick?: () => void
}

function groupElementsByCategoryKey(elements: SceneElementItem[]) {
  const byCat: Partial<Record<BreakdownCategoryKey, string[]>> = {}
  for (const e of elements) {
    if (!e.breakdown_elements?.name) continue
    const cat = e.breakdown_elements.category as BreakdownCategoryKey
    if (!byCat[cat]) byCat[cat] = []
    byCat[cat]!.push(e.breakdown_elements.name)
  }
  return byCat
}

export function SceneCard({
  sceneNumber,
  intExt,
  dayNight,
  setLocationName,
  locationName,
  synopsis,
  pageEighths,
  hasStunts,
  hasSfx,
  hasVfx,
  castNumbers = [],
  castEntries,
  castAppearanceCountsByName,
  stuntNumbers = [],
  elements = [],
  isSelected,
  onClick,
}: SceneCardProps) {
  const colorKey = getStripColor(intExt, dayNight)
  const stripStyle = STRIP_COLORS[colorKey]
  const elementsByCategory = groupElementsByCategoryKey(elements)
  const castList = castEntries ?? castNumbers.map((n) => ({ cast_number: n, character_name: '' }))
  const hasCast = castList.length > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <div className="flex min-h-[120px]">
        {/* Franja de color tipo stripboard (formato Movie Magic) */}
        <div
          className="w-2 shrink-0"
          style={{ backgroundColor: stripStyle.bg }}
          aria-label={`${intExt} ${dayNight}`}
        />
        <div className="flex-1 p-4">
          {/* Fila 1: Scene, Int/Ext, Set, Day/Night, Págs */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">
              Escena {sceneNumber}
            </span>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${stripStyle.bg}`,
                color: stripStyle.textColor ?? 'inherit',
              }}
            >
              {intExt} / {dayNight}
            </span>
            {(setLocationName || locationName) && (
              <span className="min-w-0 flex-1 text-muted-foreground">
                <span className="line-clamp-1 break-words">
                  {setLocationName}
                  {setLocationName && locationName ? ` · ${locationName}` : ''}
                </span>
              </span>
            )}
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {formatEighthsOctavosOnly(pageEighths)} pág.
            </span>
          </div>

          {/* Sinopsis */}
          {synopsis && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {synopsis}
            </p>
          )}

          {/* Cast / Stunts */}
          {(hasCast || stuntNumbers.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {hasCast && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  Cast:{' '}
                  {castList
                    .map(({ cast_number, character_name }) => {
                      const base = character_name.replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase()
                      const count =
                        castAppearanceCountsByName && base
                          ? castAppearanceCountsByName[base]
                          : undefined
                      const label = character_name ? ` ${character_name}` : ''
                      return count != null
                        ? `${cast_number}${label} (${count} apar.)`
                        : label
                          ? `${cast_number}${label}`
                          : String(cast_number)
                    })
                    .join(', ')}
                </span>
              )}
              {stuntNumbers.length > 0 && (
                <span className="rounded-md bg-muted px-2 py-0.5">
                  Stunts: {stuntNumbers.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Elementos por categoría (formato Breakdown Sheet) */}
          {BREAKDOWN_CATEGORY_ORDER.some((k) => elementsByCategory[k]?.length) && (
            <div className="mt-3 border-t border-border pt-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {BREAKDOWN_CATEGORY_ORDER.filter((k) => elementsByCategory[k]?.length).map(
                  (key) => {
                    const names = elementsByCategory[key]!
                    const label = BREAKDOWN_CATEGORIES[key]?.label ?? key
                    return (
                  <div key={key} className="flex flex-wrap items-baseline gap-1">
                    <span className="font-medium text-muted-foreground">
                      {label}:
                    </span>
                    <span className="text-foreground">
                      {names.slice(0, 3).join(', ')}
                      {names.length > 3 ? ` (+${names.length - 3})` : ''}
                    </span>
                  </div>
                    )
                  }
                )}
              </div>
            </div>
          )}

          {(hasStunts || hasSfx || hasVfx) && (
            <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
              <span>STU {hasStunts ? '✓' : '—'}</span>
              <span>SFX {hasSfx ? '✓' : '—'}</span>
              <span>VFX {hasVfx ? '✓' : '—'}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
