export type {
  ProjectType,
  IntExt,
  DayNight,
  BreakdownCategoryKey,
  Project,
  Scene,
  BreakdownElement,
  SceneElement,
  SceneCast,
  CastMember,
  Location,
  Set,
  Episode,
  SceneWithRelations,
} from './database.types'

export function getSeriesSceneNumber(episode: number, scene: number): string {
  return String(episode * 100 + scene)
}

export function getMovieSceneNumber(scene: number): string {
  return String(scene)
}

export function parseSceneNumber(
  sceneNumber: string
): { base: number; suffix: string } {
  const match = sceneNumber.match(/^(\d+)([A-Z]*)$/)
  if (match) {
    return { base: parseInt(match[1], 10), suffix: match[2] }
  }
  return { base: 0, suffix: '' }
}

export const STUNT_COORDINATOR = 100

export function getStuntNumber(actorNumber: number): number {
  return 100 + actorNumber
}
