import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type CastMemberRow = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  availability_notes: string | null
  /** Cantidad de apariciones en escenas (suma si el personaje tiene variantes como "Nombre (edad)"). */
  appearance_count?: number
}

/** Nombre base sin referencia entre paréntesis (ej. "Abuelo (74)" → "Abuelo"). La edad es solo referencia. */
function baseCharacterName(name: string): string {
  return (name ?? '').trim().replace(/\s*\(\d+\)\s*$/, '').trim() || (name ?? '').trim()
}

/**
 * Lista de cast desde la misma fuente que Elementos: breakdown_elements con categoría "cast".
 * Personajes con el mismo nombre (ej. "Abuelo" y "Abuelo (74)") se juntan en uno; el número es referencia.
 * Orden: por cantidad de apariciones (1 = el que más sale). Incluye appearance_count.
 */
export async function getCastFromBreakdown(
  supabase: Supabase,
  projectId: string
): Promise<CastMemberRow[]> {
  const { data: castElements } = await supabase
    .from('breakdown_elements')
    .select('id, name')
    .eq('project_id', projectId)
    .eq('category', 'cast')
    .order('name', { ascending: true })

  if (!castElements?.length) return []

  const elementIds = castElements.map((e) => e.id)
  const { data: sceneIds } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId)
  const ids = (sceneIds ?? []).map((s) => s.id)

  const appearanceCount: Record<string, number> = {}
  for (const e of castElements) {
    appearanceCount[e.id] = 0
  }
  if (ids.length > 0 && elementIds.length > 0) {
    const { data: sceneElements } = await supabase
      .from('scene_elements')
      .select('breakdown_element_id')
      .in('scene_id', ids)
      .in('breakdown_element_id', elementIds)
    for (const se of sceneElements ?? []) {
      appearanceCount[se.breakdown_element_id] =
        (appearanceCount[se.breakdown_element_id] ?? 0) + 1
    }
  }

  // Fallback: si no hay scene_elements (ej. datos antiguos), contar escenas distintas desde scene_cast + cast_members
  const totalFromElements = Object.values(appearanceCount).reduce((a, b) => a + b, 0)
  if (totalFromElements === 0 && ids.length > 0) {
    const { data: castMembers } = await supabase
      .from('cast_members')
      .select('id, character_name')
      .eq('project_id', projectId)
    const { data: sceneCastRows } = await supabase
      .from('scene_cast')
      .select('scene_id, cast_member_id')
      .in('scene_id', ids)
    const sceneIdsByCastId: Record<string, Set<string>> = {}
    for (const row of sceneCastRows ?? []) {
      if (!sceneIdsByCastId[row.cast_member_id]) sceneIdsByCastId[row.cast_member_id] = new Set()
      sceneIdsByCastId[row.cast_member_id].add(row.scene_id)
    }
    const countByBase: Record<string, number> = {}
    for (const c of castMembers ?? []) {
      const base = baseCharacterName(c.character_name ?? '').toLowerCase()
      if (!base) continue
      const scenes = sceneIdsByCastId[c.id]
      const count = scenes ? scenes.size : 0
      countByBase[base] = Math.max(countByBase[base] ?? 0, count)
    }
    const assignedBases = new Set<string>()
    for (const e of castElements) {
      const base = baseCharacterName(e.name ?? '').toLowerCase()
      if (!base || assignedBases.has(base)) continue
      const count = countByBase[base]
      if (count != null && count > 0) {
        appearanceCount[e.id] = count
        assignedBases.add(base)
      }
    }
  }

  // Agrupar por nombre base (ej. "Abuelo" y "Abuelo (74)" → mismo personaje)
  const groupByBase = new Map<string, typeof castElements>()
  for (const e of castElements) {
    const base = baseCharacterName(e.name ?? '')
    if (!base) continue
    const key = base.toLowerCase()
    if (!groupByBase.has(key)) groupByBase.set(key, [])
    groupByBase.get(key)!.push(e)
  }

  const merged = Array.from(groupByBase.entries()).map(([key, elements]) => {
    const totalAppearances = elements.reduce(
      (sum, e) => sum + (appearanceCount[e.id] ?? 0),
      0
    )
    const withRef = elements.find((e) => /\s*\(\d+\)\s*$/.test((e.name ?? '').trim()))
    const displayName =
      (withRef?.name ?? '').trim() ||
      (elements[0]?.name ?? '').trim() ||
      key
    return {
      id: elements[0]!.id,
      key,
      displayName: displayName || 'Sin nombre',
      totalAppearances,
    }
  })

  const sorted = merged.sort(
    (a, b) => b.totalAppearances - a.totalAppearances
  )
  return sorted.map((row, i) => ({
    id: row.id,
    character_name: row.displayName,
    cast_number: i + 1,
    actor_name: null,
    availability_notes: null,
    appearance_count: row.totalAppearances,
  }))
}

/**
 * Sincroniza cast (cast_members y scene_cast) desde elementos del desglose con categoría "cast".
 * Numera personajes 1, 2, 3… por orden de primera aparición en el guion (1 = primero que sale).
 * Para usar en servidor (p. ej. página Cast) y en la API sync-cast.
 */
export async function syncCastFromBreakdown(
  supabase: Supabase,
  projectId: string
): Promise<{ castMembers: CastMemberRow[]; synced: number }> {
  const { data: castElements } = await supabase
    .from('breakdown_elements')
    .select('id, name')
    .eq('project_id', projectId)
    .eq('category', 'cast')

  if (!castElements?.length) {
    return { castMembers: [], synced: 0 }
  }

  const castElementIds = castElements.map((e) => e.id)
  const nameById = new Map(
    castElements.map((e) => [e.id, (e.name ?? '').trim()]).filter(([, n]) => n)
  )

  const nameToDisplay: Record<string, string> = {}
  for (const e of castElements) {
    const name = (e.name ?? '').trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (!nameToDisplay[key]) nameToDisplay[key] = name
  }
  const uniqueNames = Object.keys(nameToDisplay)

  const { data: sceneIds } = await supabase
    .from('scenes')
    .select('id')
    .eq('project_id', projectId)
  const ids = (sceneIds ?? []).map((s) => s.id)

  const sceneCharacterPairs: { scene_id: string; character_name: string }[] = []
  if (ids.length > 0) {
    const { data: sceneElements } = await supabase
      .from('scene_elements')
      .select('scene_id, breakdown_element_id')
      .in('scene_id', ids)
      .in('breakdown_element_id', castElementIds)
    for (const se of sceneElements ?? []) {
      const name = nameById.get(se.breakdown_element_id)
      if (name) sceneCharacterPairs.push({ scene_id: se.scene_id, character_name: name })
    }
  }

  const { data: existingCast } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number')
    .eq('project_id', projectId)
  const castByName: Record<string, { id: string; cast_number: number }> = {}
  let nextNum = 1
  for (const c of existingCast ?? []) {
    const k = (c.character_name ?? '').trim().toLowerCase()
    if (k) castByName[k] = { id: c.id, cast_number: c.cast_number }
    if (c.cast_number >= nextNum) nextNum = c.cast_number + 1
  }

  for (const key of uniqueNames) {
    if (castByName[key]) continue
    const displayName = nameToDisplay[key] ?? key
    const { data: newCast, error: insErr } = await supabase
      .from('cast_members')
      .insert({
        project_id: projectId,
        character_name: displayName,
        cast_number: nextNum,
      })
      .select('id, cast_number')
      .single()
    if (insErr || !newCast?.id) {
      const isDup =
        insErr?.code === '23505' ||
        (insErr?.message?.toLowerCase().includes('duplicate') ?? false)
      if (isDup) {
        const { data: existing } = await supabase
          .from('cast_members')
          .select('id, cast_number')
          .eq('project_id', projectId)
          .ilike('character_name', displayName)
          .limit(1)
          .maybeSingle()
        if (existing?.id)
          castByName[key] = { id: existing.id, cast_number: existing.cast_number }
      }
    } else {
      castByName[key] = { id: newCast.id, cast_number: newCast.cast_number }
      nextNum++
    }
  }

  let sceneCastInserted = 0
  const existingPairs = new Set<string>()
  if (ids.length > 0) {
    const { data: existingSceneCast } = await supabase
      .from('scene_cast')
      .select('scene_id, cast_member_id')
      .in('scene_id', ids)
    for (const row of existingSceneCast ?? []) {
      existingPairs.add(`${row.scene_id}:${row.cast_member_id}`)
    }
    for (const { scene_id, character_name } of sceneCharacterPairs) {
      const key = character_name.trim().toLowerCase()
      const cast = castByName[key]
      if (!cast?.id) continue
      const pairKey = `${scene_id}:${cast.id}`
      if (existingPairs.has(pairKey)) continue
      const { error: scErr } = await supabase.from('scene_cast').insert({
        scene_id,
        cast_member_id: cast.id,
      })
      if (!scErr) {
        existingPairs.add(pairKey)
        sceneCastInserted++
      }
    }
  }

  const castMemberIds = Object.values(castByName).map((c) => c.id)
  // Orden de primera aparición: mínimo scene_number_sort en que sale cada personaje
  const firstAppearanceSort: Record<string, number> = {}
  for (const id of castMemberIds) firstAppearanceSort[id] = Number.POSITIVE_INFINITY
  if (castMemberIds.length > 0 && ids.length > 0) {
    const { data: scenesWithSort } = await supabase
      .from('scenes')
      .select('id, scene_number_sort')
      .eq('project_id', projectId)
    const sceneSortById = new Map((scenesWithSort ?? []).map((s) => [s.id, s.scene_number_sort]))
    const { data: sceneCastRows } = await supabase
      .from('scene_cast')
      .select('scene_id, cast_member_id')
      .in('scene_id', ids)
      .in('cast_member_id', castMemberIds)
    for (const row of sceneCastRows ?? []) {
      const sort = sceneSortById.get(row.scene_id) ?? Number.POSITIVE_INFINITY
      const current = firstAppearanceSort[row.cast_member_id] ?? Number.POSITIVE_INFINITY
      if (sort < current) firstAppearanceSort[row.cast_member_id] = sort
    }
  }
  const sortedByFirstAppearance = castMemberIds
    .map((id) => ({ id, sort: firstAppearanceSort[id] ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
  for (let i = 0; i < sortedByFirstAppearance.length; i++) {
    await supabase
      .from('cast_members')
      .update({ cast_number: i + 1 })
      .eq('id', sortedByFirstAppearance[i].id)
  }

  const idToName: Record<string, string> = {}
  for (const key of Object.keys(castByName)) {
    const obj = castByName[key]
    idToName[obj.id] = nameToDisplay[key] ?? key
  }
  const castMembers: CastMemberRow[] = sortedByFirstAppearance.map(({ id }, i) => ({
    id,
    character_name: idToName[id] ?? '',
    cast_number: i + 1,
    actor_name: null,
    availability_notes: null,
  }))

  return { castMembers, synced: sceneCastInserted }
}
