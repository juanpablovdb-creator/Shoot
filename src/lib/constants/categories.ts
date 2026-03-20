import type { BreakdownCategoryKey } from '@/types'

/**
 * Desglose tipo Movie Magic: orden de departamentos en hoja y reportes.
 * (Cast → extras/atmosfera → riesgo/FX → arte/cámara → notas.)
 */
export const BREAKDOWN_CATEGORIES: Record<
  BreakdownCategoryKey,
  { color: string; label: string; impactsBudget: boolean }
> = {
  cast: { color: '#FF0000', label: 'Cast', impactsBudget: true },
  extras: {
    color: '#FFFF00',
    label: 'Extras / fig.',
    impactsBudget: true,
  },
  stunts: { color: '#FF00FF', label: 'Stunts', impactsBudget: true },
  spfx: { color: '#00FFFF', label: 'SPFX', impactsBudget: true },
  vfx: { color: '#800080', label: 'VFX', impactsBudget: true },
  armas: { color: '#DC143C', label: 'Armas', impactsBudget: true },
  animales: { color: '#FFD700', label: 'Animales', impactsBudget: true },
  vehiculos: { color: '#8B4513', label: 'Vehículos (PIX)', impactsBudget: false },
  coordinacion_intimidad: {
    color: '#FF69B4',
    label: 'Coord. intimidad',
    impactsBudget: true,
  },
  utileria: { color: '#008000', label: 'Utilería', impactsBudget: false },
  vestuario: { color: '#000080', label: 'Vestuario', impactsBudget: false },
  maq_pelo: { color: '#DDA0DD', label: 'Maq/Pelo', impactsBudget: false },
  maq_fx: { color: '#8B008B', label: 'Maq FX', impactsBudget: true },
  arte: { color: '#808080', label: 'Arte', impactsBudget: false },
  fotografia: { color: '#2F4F4F', label: 'Fotografía', impactsBudget: true },
  sonido: { color: '#4682B4', label: 'Sonido', impactsBudget: true },
  fotografias: { color: '#5F9EA0', label: 'Fotografías', impactsBudget: false },
  musica: { color: '#4B0082', label: 'Música en escena', impactsBudget: false },
  observaciones: {
    color: '#778899',
    label: 'Observaciones / prod.',
    impactsBudget: false,
  },
}

/** Orden fijo (UI y selects), no alfabético. */
export const BREAKDOWN_CATEGORY_ORDER = Object.keys(
  BREAKDOWN_CATEGORIES
) as BreakdownCategoryKey[]

export const BREAKDOWN_CATEGORY_KEYS = BREAKDOWN_CATEGORY_ORDER
