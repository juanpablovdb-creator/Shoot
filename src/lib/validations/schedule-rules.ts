import type { ProjectType } from '@/types'
import { eighthsToPages } from '@/lib/utils/eighths'

export interface ShootingDay {
  scenes: Array<{ dayNight: string; pageEighths: number }>
  wrapTime?: Date
  callTime?: Date
}

export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
}

const PAGES_PER_DAY_LIMITS: Record<
  ProjectType,
  { min: number; max: number }
> = {
  serie_plataforma: { min: 5, max: 8 },
  novela: { min: 10, max: 15 },
  largometraje_service: { min: 1, max: 5 },
  largometraje_nacional: { min: 2, max: 7 },
  cortometraje: { min: 2, max: 7 },
}

export function validateFirstDays(
  schedule: ShootingDay[]
): ValidationResult {
  const firstThreeDays = schedule.slice(0, 3)
  for (const day of firstThreeDays) {
    const hasNightScenes = day.scenes.some((s) => s.dayNight === 'NOCHE')
    if (hasNightScenes) {
      return {
        valid: false,
        error:
          'No se debe arrancar con escenas nocturnas en los primeros 3 días',
      }
    }
  }
  return { valid: true }
}

export function validatePagesPerDay(
  day: ShootingDay,
  projectType: ProjectType
): ValidationResult {
  const totalPages = day.scenes.reduce(
    (sum, s) => sum + eighthsToPages(s.pageEighths),
    0
  )
  const { min, max } = PAGES_PER_DAY_LIMITS[projectType]

  if (totalPages < min) {
    return {
      valid: true,
      warning: `Día con pocas páginas (${totalPages.toFixed(1)}). Mínimo recomendado: ${min}`,
    }
  }
  if (totalPages > max) {
    return {
      valid: false,
      error: `Día excede el máximo (${totalPages.toFixed(1)}). Máximo: ${max}`,
    }
  }
  return { valid: true }
}
