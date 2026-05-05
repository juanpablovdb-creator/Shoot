import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'
import { normalizeBreakdownCategory } from '@/lib/breakdown-category'
import { inferCastFromSynopsis } from '@/lib/infer-cast-from-synopsis'
import { parseSceneNumber } from '@/types'
import { batchBlocksForLlm, splitScriptIntoSceneBlocks } from '@/lib/script-scene-chunks'

const VALID_CATEGORIES = new Set<string>(BREAKDOWN_CATEGORY_KEYS)

/** Texto de guion por llamada: trozos por cabecera de escena, sin cortar a mitad de escena. */
const MAX_USER_CHUNK_CHARS = 44_000
const LONG_FEATURE_SCENES_CAP = 20

function dedupeElements(els: Array<{ category: string; name: string }>) {
  const seen = new Set<string>()
  const out: Array<{ category: string; name: string }> = []
  for (const e of els) {
    const k = `${e.category}:${e.name.trim().toLowerCase()}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(e)
  }
  return out
}

function sortScenesForOutput(scenes: Array<Record<string, unknown>>) {
  return [...scenes].sort((a, b) => {
    const sa = parseSceneNumber(String(a.sceneNumber ?? ''))
    const sb = parseSceneNumber(String(b.sceneNumber ?? ''))
    if (sa.base !== sb.base) return sa.base - sb.base
    return sa.suffix.localeCompare(sb.suffix)
  })
}

function normalizeRawScene(s: unknown): Record<string, unknown> | null {
  const scene = s as Record<string, unknown>
  const elements = Array.isArray(scene.elements)
    ? (scene.elements as Array<{ category?: string; name?: string }>)
        .map((el) => {
          const catRaw = String(el?.category ?? '')
          const name = String(el?.name ?? '').trim()
          if (!name) return null
          const validCat = normalizeBreakdownCategory(catRaw, VALID_CATEGORIES)
          if (!validCat) return null
          return { category: validCat, name }
        })
        .filter(Boolean) as Array<{ category: string; name: string }>
    : []
  let pageEighths = Number(scene.pageEighths)
  if (!Number.isFinite(pageEighths) || pageEighths < 1) pageEighths = 8
  if (pageEighths > 240) pageEighths = 240
  pageEighths = Math.round(pageEighths)
  const sceneNumber = String(scene.sceneNumber ?? '').trim()
  if (!sceneNumber) return null
  return {
    ...scene,
    sceneNumber,
    sceneHeading: scene.sceneHeading ?? scene.set ?? '',
    scriptPage: typeof scene.scriptPage === 'number' ? scene.scriptPage : null,
    pageEighths,
    elements,
  }
}

function mergeSceneRow(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const els = dedupeElements([
    ...((a.elements as Array<{ category: string; name: string }>) ?? []),
    ...((b.elements as Array<{ category: string; name: string }>) ?? []),
  ])
  const synA = String(a.synopsis ?? '')
  const synB = String(b.synopsis ?? '')
  const pe = Math.max(Number(a.pageEighths) || 1, Number(b.pageEighths) || 1)
  return {
    ...a,
    ...b,
    synopsis: synB.length > synA.length ? synB : synA,
    sceneHeading: String(b.sceneHeading || a.sceneHeading || ''),
    pageEighths: pe,
    elements: els,
  }
}

function buildSystemPrompt(
  categoriesList: string,
  totalPages: number | null,
  chunkMode: boolean,
  chunkIndex: number,
  chunkTotal: number
): string {
  const chunkBlock = chunkMode
    ? `

MODO POR FRAGMENTOS (obligatorio):
Recibes solo el fragmento ${chunkIndex + 1} de ${chunkTotal} del guion. Devuelve ÚNICAMENTE escenas cuya CABECERA (línea INT./EXT./EST./…) aparece en este fragmento. No inventes escenas fuera del texto. Si no hay ninguna cabecera de escena aquí, devuelve {"scenes": []}.
`
    : ''

  const octavosClosing =
    totalPages != null && totalPages > 0
      ? `El guion completo tiene ${totalPages} páginas (${totalPages * 8} octavos en total). Para cada escena, pageEighths debe ser el TOTAL de octavos de esa escena completa: desde su cabecera hasta la siguiente, incluyendo todo diálogo y acción aunque cruce varias hojas (ej. 5/8 en una hoja y 6/8 en la otra = 11 octavos → pageEighths: 11).`
      : 'Para cada escena, pageEighths (entero) = octavos totales en todo el cuerpo de la escena; si cruza páginas, SUMa los octavos de cada parte (cada página = 8 octavos).'

  return `Eres un ASSISTENTE DE DIRECCIÓN EXPERTO para cine y televisión en Latinoamérica. Haces DESGLOSE DE PRODUCCIÓN (script breakdown) tipo Movie Magic / StudioBinder, completo y preciso.

${chunkBlock}
FORMATO DE SALIDA:
Devuelves ÚNICAMENTE un JSON válido: {"scenes": [...]}. Sin markdown ni texto adicional.

Cada escena:
- sceneNumber: string ("1", "2A", …).
- intExt: "INT" o "EXT".
- dayNight: "DÍA", "NOCHE", "AMANECER" o "ATARDECER".
- sceneHeading: locación / espacio.
- pageEighths: número entero (octavos totales de la escena).
- synopsis: 1–3 líneas.
- scriptPage: opcional.
- elements: [{ "category", "name" }], nunca vacío; siempre incluye "cast" con todos los personajes de la escena.

OCTAVOS (crítico):
${octavosClosing}
- 8 octavos = 1 página. La UI muestra p.ej. "1 3/8" si pageEighths = 11.

CAST (obligatorio en cada escena — crítico):
- Debes leer el TEXTO COMPLETO de la escena en este fragmento: desde la cabecera INT./EXT. hasta justo antes de la siguiente cabecera. Eso incluye líneas tras saltos de página, "(CONTINUED)", números de página o "OMITIDO" en PDF: el reparto debe reflejar a TODOS los personajes con diálogo o acción en cualquier parte de ese bloque, no solo la primera página.
- Mismo nombre de personaje en todas las escenas para que el sistema cuente apariciones.

STUNTS / SPFX / VFX:
- stunts: cualquier acción física riesgosa o coreografiada (peleas, caídas, cascadas, conducción peligrosa, abordaje, persecución a pie…).
- spfx: efectos en set (humo, lluvia, sangre práctica, explosión en cámara…).
- vfx: pantalla verde, limpiezas, compósitos, CGI.
Sé explícito: si la acción lo sugiere, incluye entradas en esas categorías además del cast.

EXTRAS vs FIGURACIÓN (categorías distintas):
- extras: multitudes / atmósfera genérica ("restaurante lleno", "multitud"). Cantidad en paréntesis si aplica.
- figuracion: bits con función (mesero, taxista sin diálogo, policía de fondo nombrado como bit), figuración especial.

CATEGORÍAS (claves exactas, minúsculas): ${categoriesList}

Incluye stunts, spfx, vfx cuando haya acción física, efectos prácticos o digitales.

Responde solo con el JSON.`
}

async function callOpenAiScenes(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: string
): Promise<{ scenes: unknown[]; usage?: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 16384,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 400)}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { total_tokens?: number }
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Respuesta vacía de OpenAI')
  const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned) as { scenes?: unknown[] }
  if (!Array.isArray(parsed.scenes)) throw new Error('Falta array scenes en JSON')
  return { scenes: parsed.scenes, usage: data.usage?.total_tokens }
}

function scalePageEighthsToTarget(
  scenes: Array<Record<string, unknown>>,
  targetTotalEighths: number
) {
  if (scenes.length === 0) return
  const raw = scenes.map((s) => Math.max(1, Number((s as { pageEighths: number }).pageEighths) || 1))
  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum <= 0) return
  const scale = targetTotalEighths / sum
  let acc = 0
  for (let i = 0; i < scenes.length; i++) {
    const v =
      i === scenes.length - 1
        ? Math.max(1, targetTotalEighths - acc)
        : Math.max(1, Math.round(raw[i]! * scale))
    ;(scenes[i] as { pageEighths: number }).pageEighths = v
    acc += v
  }
  const drift = targetTotalEighths - acc
  if (drift !== 0 && scenes.length > 0) {
    const last = scenes[scenes.length - 1] as { pageEighths: number }
    last.pageEighths = Math.max(1, last.pageEighths + drift)
  }
}

/**
 * POST /api/parse-script — JSON { text, projectId?, totalPages? }.
 * Guiones largos: varias llamadas por bloques de escena completas; se fusionan y ordenan.
 */
export async function POST(request: Request) {
  console.log('[parse-script] POST received')

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json(
      {
        error: 'Falta OPENAI_API_KEY en .env.local.',
        hint: 'Añade OPENAI_API_KEY y reinicia el servidor.',
      },
      { status: 500 }
    )
  }

  let body: { text?: string; projectId?: string; totalPages?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 })
  }
  const text = body.text?.trim() ?? ''
  if (!text) {
    return NextResponse.json(
      { error: 'Texto del guion vacío.', hint: 'Pega texto o sube un PDF con texto extraíble.' },
      { status: 400 }
    )
  }

  let isFeatureFilm = false
  if (body.projectId && typeof body.projectId === 'string') {
    const supabase = await createClient()
    const { data: projectMeta } = await supabase
      .from('projects')
      .select('project_type')
      .eq('id', body.projectId)
      .single()
    const projectType = (projectMeta as { project_type?: string } | null)?.project_type ?? null
    isFeatureFilm = projectType === 'largometraje_service' || projectType === 'largometraje_nacional'
    await supabase
      .from('projects')
      .update({ script_content: text.slice(0, 500000) })
      .eq('id', body.projectId)
  }

  const categoriesList = BREAKDOWN_CATEGORY_KEYS.join(', ')
  const totalPages = typeof body.totalPages === 'number' && body.totalPages > 0 ? body.totalPages : null
  const model = 'gpt-4o-mini'

  const blocks = splitScriptIntoSceneBlocks(text)
  if (blocks.length === 0) {
    return NextResponse.json({ error: 'No se pudo segmentar el guion.' }, { status: 400 })
  }
  const batches = batchBlocksForLlm(blocks, MAX_USER_CHUNK_CHARS)
  const chunkMode = batches.length > 1

  console.log(
    '[parse-script]',
    text.length,
    'chars,',
    blocks.length,
    'bloques,',
    batches.length,
    'llamada(s), modelo',
    model
  )

  const merged = new Map<string, Record<string, unknown>>()

  try {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]!
      const userContent = batch.join('\n\n')
      const systemPrompt = buildSystemPrompt(categoriesList, totalPages, chunkMode, i, batches.length)
      const { scenes: rawScenes, usage } = await callOpenAiScenes(apiKey, model, systemPrompt, userContent)
      console.log('[parse-script] chunk', i + 1, '/', batches.length, 'escenas:', rawScenes.length, 'tokens:', usage ?? '?')

      for (const raw of rawScenes) {
        const norm = normalizeRawScene(raw)
        if (!norm) continue
        const key = String(norm.sceneNumber)
        const prev = merged.get(key)
        merged.set(key, prev ? mergeSceneRow(prev, norm) : norm)
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[parse-script] Error OpenAI:', message)
    return NextResponse.json(
      {
        error: 'Error de OpenAI o JSON inválido',
        details: message.slice(0, 500),
        hint: 'Revisa OPENAI_API_KEY y la consola del servidor.',
      },
      { status: 502 }
    )
  }

  let scenes = sortScenesForOutput([...merged.values()])

  if (scenes.length === 0) {
    return NextResponse.json(
      { error: 'No se detectaron escenas.', hint: 'Comprueba que el texto tenga cabeceras INT./EXT.' },
      { status: 502 }
    )
  }

  if (isFeatureFilm && scenes.length > LONG_FEATURE_SCENES_CAP) {
    scenes = scenes.slice(0, LONG_FEATURE_SCENES_CAP)
  }

  for (const scene of scenes) {
    const elements =
      (scene as { elements?: Array<{ category: string; name: string }> }).elements ?? []
    const hasCast = elements.some((el) => el.category === 'cast')
    if (hasCast) continue
    const synopsis = String((scene as Record<string, unknown>).synopsis ?? '').trim()
    const inferred = inferCastFromSynopsis(synopsis)
    const castToAdd = inferred.length > 0 ? inferred : ['Personaje (revisar)']
    for (const name of castToAdd) {
      elements.push({ category: 'cast', name: name.slice(0, 200) })
    }
  }

  if (totalPages != null) {
    scalePageEighthsToTarget(scenes, totalPages * 8)
  }

  return NextResponse.json({ scenes })
}
