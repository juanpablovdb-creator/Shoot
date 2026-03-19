/**
 * Cast y apariciones.
 *
 * Regla: cantidad de apariciones = número de escenas donde el personaje sale (1 por escena).
 * Fuente única del conteo: scene_elements + breakdown_elements (categoría cast).
 */
import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type CastMemberRow = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  availability_notes: string | null
  /** Número de escenas en que aparece el personaje. */
  appearance_count?: number
}

const CHUNK = 80

function baseName(name: string): string {
  return (name ?? '').trim().replace(/\s*\(\d+\)\s*$/, '').trim() || (name ?? '').trim()
}

/**
 * Desglose escena por escena: qué personajes (cast) reconoce el desglose en cada escena.
 * Sirve para depurar por qué el conteo de apariciones puede estar en 0.
 */
export async function getSceneCastBreakdown(
  supabase: Supabase,
  projectId: string
): Promise<{ scene_number: string; scene_id: string; cast_names: string[] }[]> {
  const PLACEHOLDER_CAST_NAME = 'Personaje (revisar)'
  const PLACEHOLDER_CAST_NAME_LOWER = PLACEHOLDER_CAST_NAME.toLowerCase()
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, scene_number')
    .eq('project_id', projectId)
    .order('scene_number_sort', { ascending: true })
  if (!scenes?.length) return []

  const { data: castElements } = await supabase
    .from('breakdown_elements')
    .select('id, name')
    .eq('project_id', projectId)
    .eq('category', 'cast')
  if (!castElements?.length) {
    return scenes.map((s) => ({ scene_number: String(s.scene_number), scene_id: s.id, cast_names: [] }))
  }

  const castIds = castElements.map((e) => e.id)
  const nameById = new Map(castElements.map((e) => [e.id, (e.name ?? '').trim()]))

  const sceneIds = scenes.map((s) => s.id)
  const castNamesBySceneId: Record<string, string[]> = {}
  for (const s of scenes) castNamesBySceneId[s.id] = []

  console.log('[getSceneCastBreakdown] castIds:', castIds)
  console.log('[getSceneCastBreakdown] sceneIds count:', sceneIds.length)

  for (let i = 0; i < sceneIds.length; i += CHUNK) {
    const chunk = sceneIds.slice(i, i + CHUNK)
    const { data: rows } = await supabase
      .from('scene_elements')
      .select('scene_id, element_id')
      .in('scene_id', chunk)
      .in('element_id', castIds)
    for (const r of rows ?? []) {
      const name = nameById.get(r.element_id)
      if (name && castNamesBySceneId[r.scene_id]) {
        // Si el parse no infiere cast, inserta un placeholder. No debe contar como cast real.
        if (name.toLowerCase() === PLACEHOLDER_CAST_NAME_LOWER) continue
        if (!castNamesBySceneId[r.scene_id].includes(name)) {
          castNamesBySceneId[r.scene_id].push(name)
        }
      }
    }
  }

  return scenes.map((s) => ({
    scene_number: String(s.scene_number),
    scene_id: s.id,
    cast_names: castNamesBySceneId[s.id] ?? [],
  }))
}

/**
 * Lista de cast con cantidad de escenas en que aparece cada personaje.
 * Usa el mismo desglose por escena que la tabla de depuración: contamos en cuántas escenas
 * aparece cada nombre (o su nombre base) en cast_names.
 */
export async function getCastFromBreakdown(
  supabase: Supabase,
  projectId: string
): Promise<CastMemberRow[]> {
  const PLACEHOLDER_CAST_NAME = 'Personaje (revisar)'
  const { data: castMembers } = await supabase
    .from('cast_members')
    .select('id, character_name')
    .eq('project_id', projectId)
    .order('character_name', { ascending: true })
  if (!castMembers?.length) return []

  const byBaseKey = new Map<string, { id: string; character_name: string }[]>()
  for (const c of castMembers) {
    const name = (c.character_name ?? '').trim()
    const baseKey = baseName(name).toLowerCase() || name.toLowerCase() || `__id_${c.id}`
    if (!byBaseKey.has(baseKey)) byBaseKey.set(baseKey, [])
    byBaseKey.get(baseKey)!.push({ id: c.id, character_name: name })
  }
  const grouped: { id: string; character_name: string; memberIds: string[]; baseKey: string }[] = []
  for (const [baseKey, members] of byBaseKey) {
    // Nunca mostrar ni contar el placeholder como si fuera un personaje real.
    // Nota: el placeholder no sigue el formato "Nombre (NN)" de edad, así que baseName() lo deja intacto.
    const anyName = members[0]?.character_name ?? ''
    if (anyName.trim().toLowerCase() === PLACEHOLDER_CAST_NAME.toLowerCase()) continue
    const canonical = members.reduce((a, b) =>
      a.character_name.length <= b.character_name.length ? a : b
    )
    grouped.push({
      id: canonical.id,
      character_name: canonical.character_name,
      memberIds: members.map((m) => m.id),
      baseKey,
    })
  }

  const sceneBreakdown = await getSceneCastBreakdown(supabase, projectId)

  const groupedWithCount = grouped.map((g) => {
    let scenesWithGroup = 0;
    for (const row of sceneBreakdown) {
      const baseNamesInScene = row.cast_names.map((n) => baseName(n).toLowerCase());
      if (baseNamesInScene.some((b) => b === g.baseKey)) {
        scenesWithGroup++;
      }
    }
    return {
      id: g.id,
      character_name: g.character_name,
      appearance_count: scenesWithGroup,
    };
  });
  const sorted = [...groupedWithCount].sort((a, b) => {
    const d = b.appearance_count - a.appearance_count;
    if (d !== 0) return d;
    return a.character_name.localeCompare(b.character_name, 'es');
  });

  console.log('[getCastFromBreakdown] sceneBreakdown sample:', JSON.stringify(sceneBreakdown.slice(0, 2)));
  console.log('[getCastFromBreakdown] castMembers:', JSON.stringify(castMembers));

  return sorted.map((g, i) => ({
    id: g.id,
    character_name: g.character_name || 'Sin nombre',
    cast_number: i + 1,
    actor_name: null,
    availability_notes: null,
    appearance_count: g.appearance_count,
  }));
}


/**
 * Sincroniza cast_members y scene_cast desde scene_elements (para stripboard y demás).
 * Crea cast_members que falten y rellena scene_cast. El conteo en Cast viene solo de getCastFromBreakdown (scene_elements).
 */
export async function syncCastFromBreakdown(
  supabase: Supabase,
  projectId: string
): Promise<{ castMembers: CastMemberRow[]; synced: number }> {
  const PLACEHOLDER_CAST_NAME = 'Personaje (revisar)'
  const PLACEHOLDER_CAST_NAME_LOWER = PLACEHOLDER_CAST_NAME.toLowerCase()
  const { data: castElements } = await supabase
    .from('breakdown_elements')
    .select('id, name')
    .eq('project_id', projectId)
    .eq('category', 'cast')
  if (!castElements?.length) {
    return { castMembers: await getCastFromBreakdown(supabase, projectId), synced: 0 }
  }

  const castIds = castElements.map((e) => e.id)
  const nameById = new Map(castElements.map((e) => [e.id, (e.name ?? '').trim()]).filter(([, n]) => n) as [string, string][])

  const { data: sceneList } = await supabase.from('scenes').select('id').eq('project_id', projectId)
  const sceneIds = (sceneList ?? []).map((s) => s.id)

  const pairs: { scene_id: string; character_name: string }[] = []
  if (sceneIds.length > 0) {
    for (let i = 0; i < sceneIds.length; i += CHUNK) {
      const chunk = sceneIds.slice(i, i + CHUNK)
      const { data: seRows } = await supabase
        .from('scene_elements')
        .select('scene_id, element_id')
        .in('scene_id', chunk)
        .in('element_id', castIds)
      for (const r of seRows ?? []) {
        const name = nameById.get(r.element_id)
        if (name && name.toLowerCase() !== PLACEHOLDER_CAST_NAME_LOWER) {
          pairs.push({ scene_id: r.scene_id, character_name: name })
        }
      }
    }
  }

  const uniqueNames = [...new Set(pairs.map((p) => p.character_name.trim().toLowerCase()))].filter(Boolean)
  const nameToDisplay: Record<string, string> = {}
  for (const e of castElements) {
    const n = (e.name ?? '').trim()
    if (n) nameToDisplay[n.toLowerCase()] = n
  }

  const { data: existingCast } = await supabase
    .from('cast_members')
    .select('id, character_name, cast_number')
    .eq('project_id', projectId)
  const castByKey: Record<string, { id: string; cast_number: number }> = {}
  let nextNum = 1
  for (const c of existingCast ?? []) {
    const k = (c.character_name ?? '').trim().toLowerCase()
    if (k) castByKey[k] = { id: c.id, cast_number: c.cast_number }
    if (c.cast_number >= nextNum) nextNum = c.cast_number + 1
  }

  for (const key of uniqueNames) {
    if (castByKey[key]) continue
    const displayName = nameToDisplay[key] ?? key
    const { data: newCast, error } = await supabase
      .from('cast_members')
      .insert({ project_id: projectId, character_name: displayName, cast_number: nextNum })
      .select('id, cast_number')
      .single()
    if (!error && newCast?.id) {
      castByKey[key] = { id: newCast.id, cast_number: newCast.cast_number }
      nextNum++
    } else if (error?.code === '23505') {
      const { data: ex } = await supabase
        .from('cast_members')
        .select('id, cast_number')
        .eq('project_id', projectId)
        .ilike('character_name', displayName)
        .limit(1)
        .maybeSingle()
      if (ex?.id) castByKey[key] = { id: ex.id, cast_number: ex.cast_number }
    }
  }

  const existingPairs = new Set<string>()
  if (sceneIds.length > 0) {
    for (let i = 0; i < sceneIds.length; i += CHUNK) {
      const chunk = sceneIds.slice(i, i + CHUNK)
      const { data: existing } = await supabase
        .from('scene_cast')
        .select('scene_id, cast_member_id')
        .in('scene_id', chunk)
      for (const row of existing ?? []) {
        existingPairs.add(`${row.scene_id}:${row.cast_member_id}`)
      }
    }
  }

  let inserted = 0
  for (const { scene_id, character_name } of pairs) {
    const key = character_name.trim().toLowerCase()
    const cast = castByKey[key]
    if (!cast?.id) continue
    const pk = `${scene_id}:${cast.id}`
    if (existingPairs.has(pk)) continue
    const { error } = await supabase.from('scene_cast').insert({ scene_id, cast_member_id: cast.id })
    if (!error) {
      existingPairs.add(pk)
      inserted++
    }
  }

  const castMembers = await getCastFromBreakdown(supabase, projectId)
  return { castMembers, synced: inserted }
}
