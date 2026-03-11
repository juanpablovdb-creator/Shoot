'use client'

import { getStripColor } from '@/lib/constants/strip-colors'
import { STRIP_COLORS } from '@/lib/constants/strip-colors'
import { formatEighths } from '@/lib/utils/eighths'
import type { IntExt, DayNight } from '@/types'
import { cn } from '@/lib/utils'

export interface StripRowData {
  id: string
  scene_number: string
  scene_number_sort: number
  int_ext: IntExt
  day_night: DayNight
  set_name?: string | null
  synopsis?: string | null
  page_eighths: number
  has_stunts: boolean
  has_sfx: boolean
  has_vfx: boolean
  castNumbers: number[]
  /** Nombres de personaje cuando no hay scene_cast (fallback desde scene_elements) */
  castNames?: string[]
  setLocationName?: string
}

/** Páginas en octavos tipo Movie Magic: "1", "6/8", "1 6/8". */
function formatPagesEighths(eighths: number): string {
  const full = Math.floor(eighths / 8)
  const rem = eighths % 8
  if (rem === 0) return full ? `${full}` : '0'
  if (full === 0) return `${rem}/8`
  return `${full} ${rem}/8`
}

export function StripRow({
  scene_number,
  int_ext,
  day_night,
  set_name,
  setLocationName,
  synopsis,
  page_eighths,
  has_stunts,
  has_sfx,
  has_vfx,
  castNumbers,
  castNames,
  className,
}: StripRowData & { className?: string }) {
  const castDisplay =
    castNumbers.length > 0
      ? castNumbers.join(', ')
      : (castNames?.length ?? 0) > 0
        ? castNames!.join(', ')
        : '—'
  const colorKey = getStripColor(int_ext, day_night)
  const stripStyle = STRIP_COLORS[colorKey]
  const setLabel = set_name ?? setLocationName ?? '—'
  const todLabel =
    day_night === 'DÍA'
      ? 'DD'
      : day_night === 'NOCHE'
        ? 'Noche'
        : day_night === 'ATARDECER'
          ? 'ATARD.'
          : day_night === 'AMANECER'
            ? 'AMAN.'
            : day_night

  return (
    <div
      className={cn(
        'flex min-h-[72px] items-stretch border-b border-border/80 transition-colors hover:opacity-95',
        className
      )}
      style={{ backgroundColor: stripStyle.bgStrip ?? stripStyle.bg }}
      role="row"
    >
      <div
        className="w-2 shrink-0"
        style={{ backgroundColor: stripStyle.bg }}
        aria-label={`${int_ext} ${day_night}`}
      />
      {/* Columna Escena: ancho fijo para que ATARD./AMAN. quepan sin salirse */}
      <div className="flex w-[124px] shrink-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 border-r border-border/60 px-2.5 py-2">
        <span className="tabular-nums text-sm font-semibold text-gray-900">
          {scene_number}
        </span>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold"
          style={{
            backgroundColor: stripStyle.bg,
            color: stripStyle.textColor ?? '#1f2937',
          }}
        >
          {int_ext}
        </span>
        <span className="min-w-0 shrink-0 text-xs font-medium text-gray-800">
          {todLabel}
        </span>
      </div>
      {/* Set + Sinopsis: texto siempre oscuro sobre fondo claro de la franja */}
      <div className="min-w-[280px] flex-1 border-r border-border/60 px-3 py-2">
        <div className="text-sm font-semibold text-gray-900">{setLabel}</div>
        {synopsis && (
          <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-gray-700">
            {synopsis}
          </div>
        )}
      </div>
      <div className="flex w-[88px] shrink-0 items-center justify-center border-r border-border/60 px-2 py-2 text-center text-sm tabular-nums text-gray-900">
        {castDisplay}
      </div>
      <div className="flex w-[40px] shrink-0 items-center justify-center border-r border-border/60 py-2 text-center text-sm font-medium text-gray-900">
        {has_sfx ? '✓' : '—'}
      </div>
      <div className="flex w-[40px] shrink-0 items-center justify-center border-r border-border/60 py-2 text-center text-sm font-medium text-gray-900">
        {has_vfx ? '✓' : '—'}
      </div>
      <div className="flex w-[40px] shrink-0 items-center justify-center border-r border-border/60 py-2 text-center text-sm font-medium text-gray-900">
        {has_stunts ? '✓' : '—'}
      </div>
      <div className="flex w-[52px] shrink-0 items-center justify-center px-2 py-2 text-sm tabular-nums text-gray-900">
        {formatPagesEighths(page_eighths)}
      </div>
    </div>
  )
}
