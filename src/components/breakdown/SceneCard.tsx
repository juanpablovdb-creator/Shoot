'use client'

import { getStripColor } from '@/lib/constants/strip-colors'
import { STRIP_COLORS } from '@/lib/constants/strip-colors'
import { formatEighths } from '@/lib/utils/eighths'
import type { IntExt, DayNight } from '@/types'
import { cn } from '@/lib/utils'
import { ElementTag } from './ElementTag'
import type { BreakdownCategoryKey } from '@/types'

interface SceneCastMember {
  cast_members?: { character_name: string; cast_number: number } | null
}

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
  castNumbers?: number[]
  stuntNumbers?: number[]
  elements?: SceneElementItem[]
  isSelected?: boolean
  onClick?: () => void
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
  stuntNumbers = [],
  elements = [],
  isSelected,
  onClick,
}: SceneCardProps) {
  const colorKey = getStripColor(intExt, dayNight)
  const stripStyle = STRIP_COLORS[colorKey]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-border p-3 text-left text-[11px] leading-tight shadow-sm transition-shadow',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{
        backgroundColor: stripStyle.bg,
        color: stripStyle.textColor ?? undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold">{sceneNumber}</span>
        <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px]">
          {intExt}/{dayNight}
        </span>
      </div>
      {(setLocationName || locationName) && (
        <div className="mt-1 font-medium opacity-90">
          {setLocationName && <span>{setLocationName}</span>}
          {setLocationName && locationName && ' · '}
          {locationName && <span className="text-[10px]">{locationName}</span>}
        </div>
      )}
      {synopsis && (
        <p className="mt-1 line-clamp-2 opacity-90">{synopsis}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {castNumbers.length > 0 && (
          <span className="rounded bg-black/10 px-1">
            Cast: {castNumbers.join(', ')}
          </span>
        )}
        {stuntNumbers.length > 0 && (
          <span className="rounded bg-black/10 px-1">
            Stunts: {stuntNumbers.join(', ')}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {elements.map(
          (e) =>
            e.breakdown_elements && (
              <ElementTag
                key={e.breakdown_elements.name}
                name={e.breakdown_elements.name}
                category={e.breakdown_elements.category}
              />
            )
        )}
      </div>
      <div className="mt-2 flex gap-2 text-[10px] opacity-80">
        <span>STU {hasStunts ? '☑' : '☐'}</span>
        <span>SFX {hasSfx ? '☑' : '☐'}</span>
        <span>VFX {hasVfx ? '☑' : '☐'}</span>
        <span>{formatEighths(pageEighths)} pgs</span>
      </div>
    </button>
  )
}
