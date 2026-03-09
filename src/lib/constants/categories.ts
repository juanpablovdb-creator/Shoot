import type { BreakdownCategoryKey } from '@/types'

export const BREAKDOWN_CATEGORIES: Record<
  BreakdownCategoryKey,
  { color: string; label: string; impactsBudget: boolean }
> = {
  cast: { color: '#FF0000', label: 'Cast', impactsBudget: true },
  figurantes: { color: '#FFA500', label: 'Figurantes/Bits', impactsBudget: true },
  extras: { color: '#FFFF00', label: 'Extras', impactsBudget: true },
  stunts: { color: '#FF00FF', label: 'Stunts', impactsBudget: true },
  spfx: { color: '#00FFFF', label: 'SFX', impactsBudget: true },
  vfx: { color: '#800080', label: 'VFX', impactsBudget: true },
  armas: { color: '#DC143C', label: 'Armas', impactsBudget: true },
  animales: { color: '#FFD700', label: 'Animales', impactsBudget: true },
  coordinacion_intimidad: {
    color: '#FF69B4',
    label: 'Coord. Intimidad',
    impactsBudget: true,
  },
  vehiculos: { color: '#8B4513', label: 'Vehículos', impactsBudget: false },
  utileria: { color: '#008000', label: 'Utilería', impactsBudget: false },
  vestuario: { color: '#000080', label: 'Vestuario', impactsBudget: false },
  maquillaje: { color: '#FFC0CB', label: 'Maquillaje', impactsBudget: false },
  arte: { color: '#808080', label: 'Arte', impactsBudget: false },
  grafica_archivo: {
    color: '#C0C0C0',
    label: 'Gráfica/Archivo',
    impactsBudget: false,
  },
  musica: { color: '#4B0082', label: 'Música', impactsBudget: false },
}

export const BREAKDOWN_CATEGORY_KEYS = Object.keys(
  BREAKDOWN_CATEGORIES
) as BreakdownCategoryKey[]
