import type { IntExt, DayNight } from '@/types'

/**
 * Colores tipo Movie Magic Scheduling por INT/EXT y Día/Noche.
 * - INT/DÍA = blanco
 * - EXT/DÍA = amarillo
 * - INT/NOCHE = azul
 * - EXT/NOCHE = verde
 */
export type StripColorKey =
  | 'int_day'
  | 'ext_day'
  | 'int_night'
  | 'ext_night'
  | 'dusk_dawn'

export const STRIP_COLORS: Record<
  StripColorKey,
  { bg: string; bgStrip: string; label: string; textColor?: string }
> = {
  int_day: {
    bg: '#FFFFFF',
    bgStrip: '#FFFFFF',
    label: 'INT/DÍA',
  },
  ext_day: {
    bg: '#FFF176',
    bgStrip: '#FFFDE7',
    label: 'EXT/DÍA',
  },
  int_night: {
    bg: '#1976D2',
    bgStrip: '#E3F2FD',
    label: 'INT/NOCHE',
    textColor: '#FFFFFF',
  },
  ext_night: {
    bg: '#2E7D32',
    bgStrip: '#E8F5E9',
    label: 'EXT/NOCHE',
    textColor: '#FFFFFF',
  },
  dusk_dawn: {
    bg: '#EF6C00',
    bgStrip: '#FBE9E7',
    label: 'AMANECER/ATARDECER',
    textColor: '#FFFFFF',
  },
}

export function getStripColor(
  intExt: IntExt,
  dayNight: DayNight
): StripColorKey {
  if (dayNight === 'AMANECER' || dayNight === 'ATARDECER') return 'dusk_dawn'
  if (intExt === 'INT' && dayNight === 'DÍA') return 'int_day'
  if (intExt === 'EXT' && dayNight === 'DÍA') return 'ext_day'
  if (intExt === 'INT' && dayNight === 'NOCHE') return 'int_night'
  if (intExt === 'EXT' && dayNight === 'NOCHE') return 'ext_night'
  return 'int_day'
}
