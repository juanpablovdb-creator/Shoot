import type { ProjectType } from '@/types'

export const PROJECT_TYPES: Record<
  ProjectType,
  { label: string; minPagesPerDay: number; maxPagesPerDay: number }
> = {
  serie_plataforma: {
    label: 'Serie plataforma',
    minPagesPerDay: 5,
    maxPagesPerDay: 8,
  },
  novela: {
    label: 'Novela/Netflix',
    minPagesPerDay: 10,
    maxPagesPerDay: 15,
  },
  largometraje_service: {
    label: 'Largometraje service',
    minPagesPerDay: 1,
    maxPagesPerDay: 5,
  },
  largometraje_nacional: {
    label: 'Largometraje nacional',
    minPagesPerDay: 2,
    maxPagesPerDay: 7,
  },
}
