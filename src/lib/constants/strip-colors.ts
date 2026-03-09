import type { IntExt, DayNight } from '@/types'

export type StripColorKey =
  | 'white'
  | 'yellow'
  | 'orange'
  | 'light_blue'
  | 'dark_blue'

export const STRIP_COLORS: Record<
  StripColorKey,
  { bg: string; label: string; textColor?: string }
> = {
  white: { bg: '#FFFFFF', label: 'INT/DÍA' },
  yellow: { bg: '#FEF9C3', label: 'EXT/DÍA' },
  orange: { bg: '#FED7AA', label: 'AMANECER/ATARDECER' },
  light_blue: { bg: '#BFDBFE', label: 'INT/NOCHE' },
  dark_blue: { bg: '#22c55e', label: 'EXT/NOCHE', textColor: 'white' },
}

export function getStripColor(
  intExt: IntExt,
  dayNight: DayNight
): StripColorKey {
  if (dayNight === 'AMANECER' || dayNight === 'ATARDECER') return 'orange'
  if (intExt === 'INT' && dayNight === 'DÍA') return 'white'
  if (intExt === 'EXT' && dayNight === 'DÍA') return 'yellow'
  if (intExt === 'INT' && dayNight === 'NOCHE') return 'light_blue'
  if (intExt === 'EXT' && dayNight === 'NOCHE') return 'dark_blue'
  return 'white'
}
