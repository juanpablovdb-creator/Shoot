import type { BreakdownCategoryKey } from '@/types'

/**
 * Normaliza categorías legacy o alias (IA / import) al conjunto canónico tipo Movie Magic.
 */
const ALIASES: Record<string, BreakdownCategoryKey> = {
  personajes: 'cast',
  characters: 'cast',
  /** Multitudes de atmósfera */
  figurantes: 'extras',
  /** Bits / siluetas con función (map legacy IA → figuración) */
  figuration: 'figuracion',
  bits: 'figuracion',
  atmosphere_extras: 'extras',
  maquillaje: 'maq_pelo',
  makeup: 'maq_pelo',
  grafica_archivo: 'arte',
  graphics: 'arte',
  notes: 'observaciones',
  note: 'observaciones',
  produccion: 'observaciones',
  production: 'observaciones',
  coreografia_baile: 'musica',
  choreografia: 'musica',
  choreography: 'musica',
}

export function normalizeBreakdownCategory(
  raw: string,
  valid: ReadonlySet<string>
): BreakdownCategoryKey | null {
  const cat = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
  const key = (ALIASES[cat] ?? cat) as string
  if (!valid.has(key)) return null
  return key as BreakdownCategoryKey
}
