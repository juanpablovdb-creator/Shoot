/**
 * Indicadores STU / SPFX / VFX coherentes con el desglose: si hay elementos cargados,
 * la fuente de verdad son las categorías en scene_elements; si no hay ningún elemento
 * vinculado, se usan los flags de la escena (importes antiguos).
 */
type MinimalSceneElement = {
  breakdown_elements?:
    | { category?: string } // normal shape
    | Array<{ category?: string }> // some Supabase select() shapes return arrays
    | null
}

function getCategoryFromSceneElement(el: MinimalSceneElement): string | null {
  const be = el.breakdown_elements
  if (!be) return null
  if (Array.isArray(be)) return String(be[0]?.category ?? '') || null
  return String(be.category ?? '') || null
}

export function sceneHasFxCategory(
  sceneElements: MinimalSceneElement[] | null | undefined,
  category: 'stunts' | 'spfx' | 'vfx',
  dbFlag: boolean
): boolean {
  const els = sceneElements ?? []
  const hasLinkedElements = els.some((e) => getCategoryFromSceneElement(e) != null)
  if (hasLinkedElements) {
    return els.some((e) => getCategoryFromSceneElement(e) === category)
  }
  return Boolean(dbFlag)
}

/** Cuenta escenas con al menos un elemento de cada categoría (o flag si no hay elementos). */
export function countScenesByFxCategories<
  T extends {
    scene_elements?: MinimalSceneElement[] | null
    has_stunts?: boolean
    has_sfx?: boolean
    has_vfx?: boolean
  },
>(scenes: T[]): { stuntScenes: number; sfxScenes: number; vfxScenes: number } {
  let stuntScenes = 0
  let sfxScenes = 0
  let vfxScenes = 0
  for (const s of scenes) {
    if (sceneHasFxCategory(s.scene_elements, 'stunts', Boolean(s.has_stunts))) stuntScenes++
    if (sceneHasFxCategory(s.scene_elements, 'spfx', Boolean(s.has_sfx))) sfxScenes++
    if (sceneHasFxCategory(s.scene_elements, 'vfx', Boolean(s.has_vfx))) vfxScenes++
  }
  return { stuntScenes, sfxScenes, vfxScenes }
}
