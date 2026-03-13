'use client'

import { createClient } from '@/lib/supabase/client'
import type { BreakdownCategoryKey } from '@/types'

const DEFAULT_LOCATION_NAME = 'Locaciones del guion'

/** Cada página del guion = 8 octavos. */
const EIGHTHS_PER_PAGE = 8

/**
 * Reparte targetEighths entre las escenas de forma proporcional a eighths.
 * La suma resultante es exactamente targetEighths (ajusta el resto en la primera escena).
 */
function normalizeEighthsToTotal(
  eighths: number[],
  targetEighths: number
): number[] {
  if (eighths.length === 0) return []
  const sum = eighths.reduce((a, b) => a + b, 0)
  if (sum <= 0) return eighths.map(() => Math.max(1, Math.floor(targetEighths / eighths.length)))
  const out = eighths.map((e) =>
    Math.max(1, Math.round((e / sum) * targetEighths))
  )
  let current = out.reduce((a, b) => a + b, 0)
  const diff = targetEighths - current
  if (diff !== 0 && out.length > 0) {
    out[0] = Math.max(1, out[0] + diff)
  }
  return out
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

/**
 * Crea escenas y elementos en Supabase a partir del resultado del parse (IA).
 * Usado por "Importar escenas desde este guion" (en segundo plano) y por el diálogo "Importar guion".
 * Si algo falla, lanza con un mensaje descriptivo.
 */
export async function createScenesFromParsed(
  projectId: string,
  scenes: ParsedScene[],
  options?: { saveScriptContent?: string; scriptTotalPages?: number }
): Promise<{ inserted: number; skipped: number }> {
  const supabase = createClient()

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

  const totalEighths = scenesToInsert.reduce((a, t) => a + t.pageEighths, 0)
  const skipped = scenes.length - scenesToInsert.length
  const isFullImport = skipped === 0
  const scriptTotalPages =
    options?.scriptTotalPages ??
    Math.max(1, Math.round(totalEighths / EIGHTHS_PER_PAGE))
  const targetEighths = isFullImport
    ? scriptTotalPages * EIGHTHS_PER_PAGE
    : totalEighths
  const normalizedEighths =
    scenesToInsert.length > 0
      ? normalizeEighthsToTotal(
          scenesToInsert.map((t) => t.pageEighths),
          targetEighths
        )
      : []

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
  let nextCastNumber = 1
  const { data: existingCast } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number')
    .eq('project_id', projectId)
  if (existingCast?.length) {
    for (const c of existingCast) {
      const key = (c.character_name ?? '').trim().toLowerCase()
      if (key) castByName[key] = { id: c.id, cast_number: c.cast_number }
      if (c.cast_number >= nextCastNumber) nextCastNumber = c.cast_number + 1
    }
  }
  let inserted = 0

  for (let i = 0; i < scenesToInsert.length; i++) {
    const { s, sceneNumber, intExt, dayNight, sceneHeading, elements } =
      scenesToInsert[i]
    const pageEighths = normalizedEighths[i] ?? 8

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
        page_eighths: pageEighths,
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
      const cat = el.category as BreakdownCategoryKey
      const name = el.name.slice(0, 500)
      if (!name) continue

      const { data: existingEl } = await supabase
        .from('breakdown_elements')
        .select('id')
        .eq('project_id', projectId)
        .eq('category', cat)
        .eq('name', name)
        .limit(1)
        .single()

      let elementId = existingEl?.id
      if (!elementId) {
        const { data: newEl } = await supabase
          .from('breakdown_elements')
          .insert({
            project_id: projectId,
            category: cat,
            name,
          })
          .select('id')
          .single()
        elementId = newEl?.id
      }
      if (elementId) {
        await supabase.from('scene_elements').insert({
          scene_id: newScene.id,
          breakdown_element_id: elementId,
        })
      }
    }

    for (const el of elements) {
      if (el.category !== 'cast' || !el.name?.trim()) continue
      const rawName = el.name.trim().slice(0, 200)
      const key = rawName.toLowerCase()
      let castId = castByName[key]?.id
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
            }
          }
          if (!castId) continue
        } else {
          castId = newCast.id
          castByName[key] = { id: castId, cast_number: nextCastNumber }
          nextCastNumber++
        }
      }
      if (castId) {
        await supabase.from('scene_cast').insert({
          scene_id: newScene.id,
          cast_member_id: castId,
        })
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

  return { inserted, skipped }
}

/**
 * Borra todas las escenas del proyecto (y scene_cast, scene_elements) para poder
 * volver a importar con el nuevo desglose (p. ej. con el prompt mejorado de cast/SFX/VFX).
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
  if (sceneIds.length === 0) return
  await supabase.from('scene_cast').delete().in('scene_id', sceneIds)
  await supabase.from('scene_elements').delete().in('scene_id', sceneIds)
  const { error: delErr } = await supabase
    .from('scenes')
    .delete()
    .eq('project_id', projectId)
  if (delErr) {
    throw new Error(`Error al borrar escenas: ${delErr.message}`)
  }
}
