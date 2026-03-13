'use client'

import { getStripColor } from '@/lib/constants/strip-colors'
import { STRIP_COLORS } from '@/lib/constants/strip-colors'
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
  /** Locación específica de rodaje (ej. ESTUDIO BOGOTÁ, CHILE) */
  specificLocation?: string | null
  page_eighths: number
  has_stunts: boolean
  has_sfx: boolean
  has_vfx: boolean
  /** Números de cast (actores, &lt; 100) */
  castNumbers: number[]
  /** Números de stunts (coordinador 100, etc.) */
  stuntNumbers: number[]
  /** Nombres de personaje cuando no hay scene_cast (fallback desde scene_elements) */
  castNames?: string[]
  setLocationName?: string
}

/** Páginas en octavos: siempre muestra "X Y/8" (cada página = 8 octavos). */
function formatPagesEighths(eighths: number): string {
  const e = Math.max(0, Math.round(Number(eighths)) || 0)
  const full = Math.floor(e / 8)
  const rem = e % 8
  if (full === 0) return rem === 0 ? '0' : `${rem}/8`
  return rem === 0 ? `${full} 0/8` : `${full} ${rem}/8`
}

const dayNightLabel: Record<string, string> = {
  DÍA: 'Día',
  NOCHE: 'Noche',
  ATARDECER: 'Atardec',
  AMANECER: 'Aman',
}

export function StripRow({
  scene_number,
  int_ext,
  day_night,
  set_name,
  setLocationName,
  synopsis,
  specificLocation,
  page_eighths,
  has_stunts,
  has_sfx,
  has_vfx,
  castNumbers,
  stuntNumbers,
  castNames,
  className,
}: StripRowData & { className?: string }) {
  const castDisplay =
    castNumbers.length > 0
      ? `Cast: ${castNumbers.join(', ')}`
      : (castNames?.length ?? 0) > 0
        ? `Cast: ${castNames!.join(', ')}`
        : 'Cast: —'
  const stuntsDisplay =
    stuntNumbers.length > 0 ? `Stunts: ${stuntNumbers.join(', ')}` : 'Stunts:'
  const colorKey = getStripColor(int_ext, day_night)
  const stripStyle = STRIP_COLORS[colorKey]
  const titleLabel = set_name ?? setLocationName ?? '—'
  const todLabel = dayNightLabel[day_night] ?? day_night
  const locationLabel = specificLocation && specificLocation.trim() !== '' ? specificLocation : 'Por definir'

  // Líneas que llegan hasta abajo: una sola fila con items-stretch; borde derecho en cada celda
  const colBorder = 'border-r border-gray-800'
  const elementsLine = [
    'STU',
    has_stunts ? '✓' : '—',
    'SFX',
    has_sfx ? '✓' : '—',
    'VFX',
    has_vfx ? '✓' : '—',
    'Ext: 0',
    'Bits: 0',
  ].join(' ')

  return (
    <div
      className={cn(
        'flex min-h-[72px] items-stretch border-b border-gray-800 transition-colors hover:opacity-95',
        className
      )}
      style={{ backgroundColor: stripStyle.bgStrip ?? stripStyle.bg }}
      role="row"
    >
      {/* Franja de color */}
      <div
        className={cn('w-2 shrink-0', colBorder)}
        style={{ backgroundColor: stripStyle.bg }}
        aria-label={`${int_ext} ${day_night}`}
      />
      {/* Escena: número grande + Día abajo */}
      <div className={cn('flex w-[52px] shrink-0 flex-col justify-center px-1.5', colBorder)}>
        <span className="text-base font-bold tabular-nums text-gray-900">{scene_number}</span>
        <span className="text-[11px] font-normal text-gray-800">{todLabel}</span>
      </div>
      {/* Bloque Título + Locación esp.: crece para ocupar el ancho disponible */}
      <div className={cn('flex min-w-[300px] flex-1 flex-col', colBorder)}>
        {/* Mitad superior: Título | Locación esp. (la línea entre ellos solo aquí = hasta la mitad) */}
        <div className="flex min-h-[36px] flex-1">
          <div className="flex min-w-0 flex-1 flex-col justify-start border-r border-gray-800 px-2 py-1.5">
            <span className="text-xs font-normal text-gray-800">{int_ext}</span>
            <span className="mt-0.5 text-base font-bold leading-tight text-gray-900">{titleLabel}</span>
          </div>
          <div className="flex w-[100px] shrink-0 items-start px-2 py-1.5">
            <span className="text-xs font-normal text-gray-800">{locationLabel}</span>
          </div>
        </div>
        {/* Mitad inferior: descripción entre las dos columnas (sin línea en medio) */}
        <div className="flex w-full px-2 py-1 pb-1.5">
          {synopsis && (
            <div className="line-clamp-3 w-full text-[11px] font-normal leading-snug text-gray-700">
              {synopsis}
            </div>
          )}
        </div>
      </div>
      {/* Cast: arriba "Cast: n", línea horizontal, abajo STU SFX Ext Bits */}
      <div className={cn('flex w-[100px] shrink-0 flex-col', colBorder)}>
        <div className="flex flex-1 flex-col justify-center px-2 py-1">
          <span className="text-xs font-normal text-gray-900 underline decoration-gray-900/60">{castDisplay}</span>
        </div>
        <div className="border-t border-gray-800" />
        <div className="flex items-center px-2 py-1">
          <span className="text-[10px] font-normal leading-tight text-gray-700">{elementsLine}</span>
        </div>
      </div>
      {/* Stunts: arriba "Stunts:n", línea, abajo vacío */}
      <div className={cn('flex w-[72px] shrink-0 flex-col', colBorder)}>
        <div className="flex flex-1 flex-col justify-center px-2 py-1">
          <span className="text-xs font-normal tabular-nums text-gray-900">{stuntsDisplay}</span>
        </div>
        <div className="border-t border-gray-800" />
        <div className="min-h-[20px] px-2 py-1" />
      </div>
      {/* Págs: etiqueta pequeña + número grande */}
      <div className={cn('flex w-[52px] shrink-0 flex-col items-end justify-center px-2 py-1.5', colBorder)}>
        <span className="text-[10px] font-normal text-gray-700">Págs.</span>
        <span className="text-base font-bold tabular-nums text-gray-900">{formatPagesEighths(page_eighths)}</span>
      </div>
    </div>
  )
}
