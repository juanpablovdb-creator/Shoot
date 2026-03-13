import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type CastMemberRow = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  availability_notes: string | null
}

/**
 * Sincroniza elenco (cast_members y scene_cast) desde elementos del desglose con categoría "cast".
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
  const appearanceCount: Record<string, number> = {}
  for (const id of castMemberIds) appearanceCount[id] = 0
  if (castMemberIds.length > 0) {
    const { data: sceneCastRows } = await supabase
      .from('scene_cast')
      .select('cast_member_id')
      .in('cast_member_id', castMemberIds)
    for (const row of sceneCastRows ?? []) {
      appearanceCount[row.cast_member_id] = (appearanceCount[row.cast_member_id] ?? 0) + 1
    }
  }
  const sortedByAppearances = castMemberIds
    .map((id) => ({ id, count: appearanceCount[id] ?? 0 }))
    .sort((a, b) => b.count - a.count)
  for (let i = 0; i < sortedByAppearances.length; i++) {
    await supabase
      .from('cast_members')
      .update({ cast_number: i + 1 })
      .eq('id', sortedByAppearances[i].id)
  }

  const idToName: Record<string, string> = {}
  for (const key of Object.keys(castByName)) {
    const obj = castByName[key]
    idToName[obj.id] = nameToDisplay[key] ?? key
  }
  const castMembers: CastMemberRow[] = sortedByAppearances.map(({ id }, i) => ({
    id,
    character_name: idToName[id] ?? '',
    cast_number: i + 1,
    actor_name: null,
    availability_notes: null,
  }))

  return { castMembers, synced: sceneCastInserted }
}
