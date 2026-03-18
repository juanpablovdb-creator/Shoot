'use client'

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  createScenesFromParsedCore,
  type ParsedElement,
  type ParsedScene,
} from '@/lib/breakdown-import-core'

export type { ParsedElement, ParsedScene }

/**
 * Crea escenas y elementos en Supabase (usa cliente del navegador si no se pasa supabase).
 * Para importación desde servidor, usar POST /api/projects/[projectId]/breakdown/import.
 */
export async function createScenesFromParsed(
  projectId: string,
  scenes: ParsedScene[],
  options?: { saveScriptContent?: string; scriptTotalPages?: number },
  supabaseInstance?: SupabaseClient
): Promise<{ inserted: number; skipped: number; errors?: string[] }> {
  const supabase = supabaseInstance ?? createClient()
  return createScenesFromParsedCore(supabase, projectId, scenes, options)
}

/**
 * Borra todas las escenas del proyecto (scene_cast, scene_elements, scenes) y además
 * cast_members y breakdown_elements de categoría "cast", para que al reimportar el
 * desglose no queden personajes huérfanos con 0 apariciones.
 */
export async function deleteAllProjectScenes(projectId: string): Promise<void> {
  const supabase = createClient()
  const { data: scenes, error: listErr } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId)
  if (listErr) {
    throw new Error(`Error al listar escenas: ${listErr.message}`)
  }
  const sceneIds = (scenes ?? []).map((r) => r.id)
  if (sceneIds.length > 0) {
    await supabase.from('scene_cast').delete().in('scene_id', sceneIds)
    await supabase.from('scene_elements').delete().in('scene_id', sceneIds)
  }
  const { error: delErr } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId)
  if (delErr) {
    throw new Error(`Error al borrar escenas: ${delErr.message}`)
  }
  // Quitar cast y elementos cast del desglose para que la próxima importación no muestre nombres con 0 apariciones
  const { error: delCastErr } = await supabase
    .from('cast_members')
    .delete()
    .eq('project_id', projectId)
  if (delCastErr) {
    throw new Error(`Error al borrar cast: ${delCastErr.message}`)
  }
  const { error: delBeErr } = await supabase
    .from('breakdown_elements')
    .delete()
    .eq('project_id', projectId)
    .eq('category', 'cast')
  if (delBeErr) {
    throw new Error(`Error al borrar elementos cast del desglose: ${delBeErr.message}`)
  }
}
