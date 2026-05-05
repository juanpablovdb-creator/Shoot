import type { ProjectType } from '@/types'

/**
 * Columna legacy `projects.type` en algunas bases sigue siendo un enum/cierre
 * sin `cortometraje`; ahí se debe guardar un valor ya existente. La app usa
 * siempre `project_type` para la lógica (incl. cortometraje).
 */
export const PROJECT_TYPE_LEGACY_DB_TYPE: Record<ProjectType, string> = {
  serie_plataforma: 'serie_plataforma',
  novela: 'novela',
  largometraje_service: 'largometraje_service',
  largometraje_nacional: 'largometraje_nacional',
  /** Mismo perfil de páginas/día que largometraje nacional. */
  cortometraje: 'largometraje_nacional',
}

export const PROJECT_TYPES: Record<
  ProjectType,
  { label: string; minPagesPerDay: number; maxPagesPerDay: number }
> = {
  serie_plataforma: {
    label: 'Serie Plataforma (Service)',
    minPagesPerDay: 5,
    maxPagesPerDay: 8,
  },
  novela: {
    label: 'Serie Nacional / Novela',
    minPagesPerDay: 10,
    maxPagesPerDay: 15,
  },
  largometraje_service: {
    label: 'Largometraje (Service)',
    minPagesPerDay: 1,
    maxPagesPerDay: 5,
  },
  largometraje_nacional: {
    label: 'Largometraje (Nacional)',
    minPagesPerDay: 2,
    maxPagesPerDay: 7,
  },
  cortometraje: {
    label: 'Cortometraje',
    minPagesPerDay: 2,
    maxPagesPerDay: 7,
  },
}

/** Claves permitidas al crear proyecto (validación API). */
export const PROJECT_TYPE_KEYS = Object.keys(PROJECT_TYPES) as ProjectType[]
