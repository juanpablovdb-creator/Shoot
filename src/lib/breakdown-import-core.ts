/**
 * Lógica de importación de desglose sin dependencias de cliente.
 * Usado por la API en servidor; el cliente usa breakdown-import.ts que reexporta y llama con createClient().
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BreakdownCategoryKey } from '@/types'
import { BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'
import { normalizeBreakdownCategory } from '@/lib/breakdown-category'
import { inferCastFromSynopsis } from '@/lib/infer-cast-from-synopsis'

const VALID_BREAKDOWN_CATEGORIES = new Set<string>(BREAKDOWN_CATEGORY_KEYS)

const DEFAULT_LOCATION_NAME = 'Locaciones del guion'
const EIGHTHS_PER_PAGE = 8

/** Nombre sin edad entre paréntesis al final (ej. 'david (14)' → 'david'). */
function baseName(name: string): string {
  return (name ?? '').trim().replace(/\s*\(\d+\)\s*$/, '').trim() || (name ?? '').trim()
}

export interface ParsedElement {
  category: string
  name: string
}

export interface ParsedScene {
  sceneNumber?: string
  intExt?: string
  dayNight?: string
  synopsis?: string
  pageEighths?: number
  sceneHeading?: string
  scriptPage?: number | null
  elements?: ParsedElement[]
}

export async function createScenesFromParsedCore(
  supabase: SupabaseClient,
  projectId: string,
  scenes: ParsedScene[],
  options?: { saveScriptContent?: string; scriptTotalPages?: number }
): Promise<{ inserted: number; skipped: number; errors?: string[] }> {
  const { data: existingScenes } = await supabase
    .from('scenes')
    .select('scene_number, scene_number_sort')
    .eq('project_id', projectId)
  const existingSceneNumbers = new Set(
    (existingScenes ?? []).map((r) => String(r.scene_number))
  )
  const maxSort =
    (existingScenes ?? []).reduce(
      (max, r) => Math.max(max, r.scene_number_sort ?? 0),
      0
    ) ?? 0
  let nextSort = maxSort + 1

  const scenesToInsert: Array<{
    s: ParsedScene
    sceneNumber: string
    intExt: 'INT' | 'EXT'
    dayNight: 'DÍA' | 'NOCHE' | 'AMANECER' | 'ATARDECER'
    pageEighths: number
    sceneHeading: string
    elements: ParsedElement[]
  }> = []
  for (const s of scenes) {
    const sceneNumber = String(s.sceneNumber ?? scenesToInsert.length + 1)
    if (existingSceneNumbers.has(sceneNumber)) continue
    const intExt = (s.intExt === 'EXT' ? 'EXT' : 'INT') as 'INT' | 'EXT'
    const dayNight = ['DÍA', 'NOCHE', 'AMANECER', 'ATARDECER'].includes(
      s.dayNight ?? ''
    )
      ? (s.dayNight as 'DÍA' | 'NOCHE' | 'AMANECER' | 'ATARDECER')
      : 'DÍA'
    const pageEighths = Math.max(1, Math.min(128, Number(s.pageEighths) || 8))
    const sceneHeading = (s.sceneHeading ?? '').trim().slice(0, 200)
    const elements = Array.isArray(s.elements) ? s.elements : []
    scenesToInsert.push({
      s,
      sceneNumber,
      intExt,
      dayNight,
      pageEighths,
      sceneHeading,
      elements,
    })
  }

  // Endurecer: asegurar que cada escena tenga al menos un cast para que scene_elements/scene_cast se llenen
  for (const row of scenesToInsert) {
    const hasCast = row.elements.some((el) => String(el.category ?? '').toLowerCase() === 'cast')
    if (hasCast) continue
    const synopsis = (row.s.synopsis ?? '').trim()
    const inferred = inferCastFromSynopsis(synopsis)
    const names = inferred.length > 0 ? inferred : ['Personaje (revisar)']
    for (const name of names) {
      row.elements.push({ category: 'cast', name: name.slice(0, 200) })
    }
  }

  const totalEighths = scenesToInsert.reduce((a, t) => a + t.pageEighths, 0)
  const skipped = scenes.length - scenesToInsert.length
  const scriptTotalPages =
    options?.scriptTotalPages ??
    Math.max(1, Math.round(totalEighths / EIGHTHS_PER_PAGE))

  const { data: locs, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', DEFAULT_LOCATION_NAME)
    .limit(1)
  if (locError) {
    throw new Error(`Error al leer locaciones: ${locError.message}`)
  }
  let defaultLocationId = locs?.[0]?.id
  if (!defaultLocationId) {
    const { data: newLoc, error: insertLocErr } = await supabase
      .from('locations')
      .insert({ project_id: projectId, name: DEFAULT_LOCATION_NAME })
      .select('id')
      .single()
    if (insertLocErr) {
      throw new Error(
        `No se pudo crear la locación por defecto: ${insertLocErr.message}. ¿Tienes permiso sobre el proyecto?`
      )
    }
    defaultLocationId = newLoc?.id ?? null
  }

  const setIdsByHeading: Record<string, string> = {}
  const castByName: Record<string, { id: string; cast_number: number }> = {}
  /** Por nombre base (sin edad), reutilizar el que tenga nombre más corto. */
  const castByBaseKey: Record<string, { id: string; cast_number: number; character_name: string }> = {}
  let nextCastNumber = 1
  const { data: existingCast } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number')
    .eq('project_id', projectId)
  if (existingCast?.length) {
    for (const c of existingCast) {
      const name = (c.character_name ?? '').trim()
      const key = name.toLowerCase()
      if (key) castByName[key] = { id: c.id, cast_number: c.cast_number }
      const baseKey = baseName(name).toLowerCase()
      if (baseKey) {
        const current = castByBaseKey[baseKey]
        if (!current || name.length < current.character_name.length) {
          castByBaseKey[baseKey] = { id: c.id, cast_number: c.cast_number, character_name: name }
        }
      }
      if (c.cast_number >= nextCastNumber) nextCastNumber = c.cast_number + 1
    }
  }
  let inserted = 0
  const errors: string[] = []

  for (let i = 0; i < scenesToInsert.length; i++) {
    const { s, sceneNumber, intExt, dayNight, sceneHeading, elements, pageEighths } =
      scenesToInsert[i]
    const pageEighthsVal = pageEighths ?? 8

    let setId: string | null = null
    if (sceneHeading && defaultLocationId) {
      if (setIdsByHeading[sceneHeading]) {
        setId = setIdsByHeading[sceneHeading]
      } else {
        const { data: existingSet } = await supabase
          .from('sets')
          .select('id')
          .eq('project_id', projectId)
          .eq('location_id', defaultLocationId)
          .eq('name', sceneHeading)
          .limit(1)
          .single()
        if (existingSet?.id) {
          setId = existingSet.id
          setIdsByHeading[sceneHeading] = existingSet.id
        } else {
          const { data: newSet } = await supabase
            .from('sets')
            .insert({
              project_id: projectId,
              location_id: defaultLocationId,
              name: sceneHeading,
            })
            .select('id')
            .single()
          if (newSet?.id) {
            setId = newSet.id
            setIdsByHeading[sceneHeading] = newSet.id
          }
        }
      }
    }

    const hasStunts = elements.some((el) => el.category === 'stunts')
    const hasSfx = elements.some((el) => el.category === 'spfx')
    const hasVfx = elements.some((el) => el.category === 'vfx')

    const { data: newScene, error: insertErr } = await supabase
      .from('scenes')
      .insert({
        project_id: projectId,
        scene_number: sceneNumber,
        scene_number_sort: nextSort,
        int_ext: intExt,
        day_night: dayNight,
        synopsis: (s.synopsis ?? '').slice(0, 500) || null,
        page_eighths: pageEighthsVal,
        set_id: setId,
        set_name: sceneHeading || 'Sin especificar',
        has_stunts: hasStunts,
        has_sfx: hasSfx,
        has_vfx: hasVfx,
      })
      .select('id')
      .single()

    if (insertErr || !newScene?.id) {
      const isDuplicate =
        insertErr?.message?.includes('duplicate key') &&
        insertErr?.message?.includes('scene_number')
      if (inserted === 0 && insertErr && !isDuplicate) {
        throw new Error(
          `Error al crear la primera escena: ${insertErr.message}. Revisa permisos (RLS) o que el proyecto exista.`
        )
      }
      continue
    }

    existingSceneNumbers.add(sceneNumber)
    inserted++
    nextSort++

    for (const el of elements) {
      const catRaw = String(el.category ?? '').trim()
      const cat = normalizeBreakdownCategory(catRaw, VALID_BREAKDOWN_CATEGORIES)
      const name = el.name.slice(0, 500)
      if (!name) continue
      if (!cat) {
        errors.push(
          `Escena ${sceneNumber} — categoría no reconocida "${catRaw}" en "${name.slice(0, 80)}" (omítelo o usa una clave válida).`
        )
        continue
      }

      const { data: existingEl } = await supabase
        .from('breakdown_elements')
        .select('id')
        .eq('project_id', projectId)
        .eq('category', cat)
        .eq('name', name)
        .limit(1)
        .maybeSingle()

      let elementId = existingEl?.id
      if (!elementId) {
        const { data: newEl, error: elErr } = await supabase
          .from('breakdown_elements')
          .insert({
            project_id: projectId,
            category: cat,
            name,
          })
          .select('id')
          .single()
        if (elErr) {
          errors.push(`Escena ${sceneNumber} - elemento "${name}" (${cat}): ${elErr.message}`)
          continue
        }
        elementId = newEl?.id
      }
      if (elementId) {
        const { error: seErr } = await supabase.from('scene_elements').insert({
          scene_id: newScene.id,
          element_id: elementId,
        })
        if (seErr) {
          errors.push(`Escena ${sceneNumber} - vincular elemento: ${seErr.message}`)
        }
      }
    }

    const castIdsAddedThisScene = new Set<string>()
    for (const el of elements) {
      if (String(el.category ?? '').toLowerCase() !== 'cast' || !el.name?.trim()) continue
      const rawName = el.name.trim().slice(0, 200)
      const key = rawName.toLowerCase()
      const baseKey = baseName(rawName).toLowerCase()
      let castId = castByName[key]?.id ?? castByBaseKey[baseKey]?.id
      if (!castId) {
        const { data: newCast, error: castErr } = await supabase
          .from('cast_members')
          .insert({
            project_id: projectId,
            character_name: rawName,
            cast_number: nextCastNumber,
          })
          .select('id, cast_number')
          .single()
        if (castErr || !newCast?.id) {
          const isDuplicate =
            castErr?.code === '23505' ||
            (castErr?.message?.toLowerCase().includes('duplicate') ?? false)
          if (isDuplicate) {
            const { data: existing } = await supabase
              .from('cast_members')
              .select('id, cast_number')
              .eq('project_id', projectId)
              .ilike('character_name', rawName)
              .limit(1)
              .maybeSingle()
            if (existing?.id) {
              castId = existing.id
              castByName[key] = { id: castId, cast_number: existing.cast_number }
              if (baseKey) castByBaseKey[baseKey] = { id: castId, cast_number: existing.cast_number, character_name: rawName }
            }
          }
          if (!castId) continue
        } else {
          castId = newCast.id
          castByName[key] = { id: castId, cast_number: nextCastNumber }
          if (baseKey) {
            const cur = castByBaseKey[baseKey]
            if (!cur || rawName.length < cur.character_name.length) {
              castByBaseKey[baseKey] = { id: castId, cast_number: nextCastNumber, character_name: rawName }
            }
          }
          nextCastNumber++
        }
      }
      if (castId && !castIdsAddedThisScene.has(castId)) {
        castIdsAddedThisScene.add(castId)
        const { error: scErr } = await supabase.from('scene_cast').insert({
          scene_id: newScene.id,
          cast_member_id: castId,
        })
        if (scErr) {
          errors.push(`Escena ${sceneNumber} - vincular cast: ${scErr.message}`)
        }
      }
    }
  }

  if (inserted === 0 && scenes.length > 0) {
    const allDuplicates = scenes.every((s) =>
      existingSceneNumbers.has(String(s.sceneNumber ?? ''))
    )
    if (!allDuplicates) {
      throw new Error(
        'No se creó ninguna escena. Revisa que tengas permiso sobre el proyecto y que las tablas scenes, locations y sets existan (supabase db push).'
      )
    }
  }

  const projectUpdates: { script_content?: string; script_total_pages?: number } = {}
  if (options?.saveScriptContent) {
    projectUpdates.script_content = options.saveScriptContent.slice(0, 500000)
  }
  if (inserted > 0 && skipped === 0) {
    projectUpdates.script_total_pages = scriptTotalPages
  }
  if (Object.keys(projectUpdates).length > 0) {
    await supabase.from('projects').update(projectUpdates).eq('id', projectId)
  }

  return { inserted, skipped, errors: errors.length > 0 ? errors : undefined }
}
