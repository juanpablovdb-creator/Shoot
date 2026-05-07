/**
 * Tipos alineados al schema de Supabase.
 * Generar con `npx supabase gen types typescript --project-id ID` cuando haya acceso al proyecto.
 */

export type ProjectType =
  | 'serie_plataforma'
  | 'novela'
  | 'largometraje_service'
  | 'largometraje_nacional'
  | 'cortometraje'

export type IntExt = 'INT' | 'EXT'
export type DayNight = 'DÍA' | 'NOCHE' | 'AMANECER' | 'ATARDECER'

/** Categorías de desglose alineadas a Movie Magic (hoja por escena + reportes DOODS). */
export type BreakdownCategoryKey =
  | 'cast'
  | 'extras'
  | 'figuracion'
  | 'stunts'
  | 'spfx'
  | 'vfx'
  | 'armas'
  | 'animales'
  | 'vehiculos'
  | 'coordinacion_intimidad'
  | 'utileria'
  | 'vestuario'
  | 'maq_pelo'
  | 'maq_fx'
  | 'arte'
  | 'fotografia'
  | 'sonido'
  | 'fotografias'
  | 'musica'
  | 'observaciones'

export interface Project {
  id: string
  name: string
  code: string | null
  project_type: ProjectType
  description: string | null
  script_content: string | null
  script_file_path: string | null
  script_file_name: string | null
  script_total_pages: number | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface Scene {
  id: string
  project_id: string
  episode_id: string | null
  scene_number: string
  scene_number_sort: number
  int_ext: IntExt
  day_night: DayNight
  location_id: string | null
  set_id: string | null
  set_name: string | null
  synopsis: string | null
  page_eighths: number
  has_stunts: boolean
  has_sfx: boolean
  has_vfx: boolean
  script_page: number | null
  script_day: number | null
  unit: string | null
  sequence: string | null
  location: string | null
  est_time: string | null
  comments: string | null
  scene_note: string | null
  scene_from: string | null
  created_at: string
  updated_at: string
}

export interface BreakdownElement {
  id: string
  project_id: string
  category: BreakdownCategoryKey
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface SceneElement {
  id: string
  scene_id: string
  element_id: string
  breakdown_elements?: BreakdownElement
}

export interface CastMember {
  id: string
  project_id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SceneCast {
  id: string
  scene_id: string
  cast_member_id: string
  cast_members?: CastMember
}

export interface Location {
  id: string
  project_id: string
  name: string
  address: string | null
  city: string | null
  created_at: string
  updated_at: string
}

export interface Set {
  id: string
  project_id: string
  location_id: string
  name: string
  description: string | null
  locations?: Location
  created_at: string
  updated_at: string
}

export interface Episode {
  id: string
  project_id: string
  episode_number: number
  title: string | null
  created_at: string
  updated_at: string
}

export interface SceneWithRelations extends Scene {
  sets?: Set | null
  scene_cast?: Array<{ cast_members: CastMember }>
  scene_elements?: Array<{ breakdown_elements: BreakdownElement }>
}
