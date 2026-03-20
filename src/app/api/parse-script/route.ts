import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'
import { normalizeBreakdownCategory } from '@/lib/breakdown-category'
import { inferCastFromSynopsis } from '@/lib/infer-cast-from-synopsis'

const VALID_CATEGORIES = new Set<string>(BREAKDOWN_CATEGORY_KEYS)
const DEFAULT_LOCATION_NAME = 'Locaciones del guion'

/** Máximo de caracteres del guion que enviamos a OpenAI (gpt-4o-mini soporta ~128k tokens). */
const MAX_SCRIPT_CHARS = 60_000

/**
 * POST /api/parse-script
 *
 * Acepta JSON: { "text": "..." [, "projectId": "uuid" ] }.
 * El texto se extrae del PDF en el cliente (navegador) para evitar el worker en el servidor.
 * La IA (OpenAI gpt-4o-mini) devuelve un desglose tipo Movie Magic.
 * Requiere OPENAI_API_KEY en .env.local.
 */
export async function POST(request: Request) {
  console.log('[parse-script] POST received')

  const apiKey = process.env.OPENAI_API_KEY
  console.log('[parse-script] OPENAI_API_KEY:', apiKey ? 'present' : 'MISSING')
  if (!apiKey || !apiKey.trim()) {
    console.warn('[parse-script] OPENAI_API_KEY no está definida. Añádela en .env.local')
    return NextResponse.json(
      {
        error:
          'Falta OPENAI_API_KEY en .env.local. Usa GPT-4o-mini para mejor costo.',
        hint: 'Añade OPENAI_API_KEY en .env.local y reinicia el servidor (npm run dev).',
      },
      { status: 500 }
    )
  }

  let body: { text?: string; projectId?: string; useGpt4?: boolean; totalPages?: number }
  try {
    body = await request.json()
  } catch {
    console.warn('[parse-script] Rejected: invalid JSON body')
    return NextResponse.json(
      { error: 'Cuerpo JSON inválido. Envía { "text": "..." }.' },
      { status: 400 }
    )
  }
  const text = body.text?.trim() ?? ''
  console.log('[parse-script] text length:', text.length)
  if (!text) {
    console.warn('[parse-script] Rejected: text empty')
    return NextResponse.json(
      { error: 'Texto del guion vacío.', hint: 'Pega texto o sube un PDF con texto extraíble.' },
      { status: 400 }
    )
  }
  if (body.projectId && typeof body.projectId === 'string') {
    const supabase = await createClient()
    await supabase
      .from('projects')
      .update({ script_content: text.slice(0, 500000) })
      .eq('id', body.projectId)
  }

  const categoriesList = BREAKDOWN_CATEGORY_KEYS.join(', ')
  const totalPages = typeof body.totalPages === 'number' && body.totalPages > 0 ? body.totalPages : null

  const systemPrompt = `Eres un ASSISTENTE DE DIRECCIÓN EXPERTO para cine y televisión en Latinoamérica. Tu trabajo es hacer un DESGLOSE DE PRODUCCIÓN (script breakdown) profesional, escena por escena, con todos los elementos que dirección y producción necesitan para planificar rodaje, presupuesto y plan de trabajo. Estilo Movie Magic / StudioBinder. El desglose debe ser COMPLETO y PRECISO: de él depende el cálculo de días de rodaje, cantidad de apariciones por personaje y la lista de elementos por categoría.

OBLIGATORIO: Incluye TODAS las escenas del guion en el array "scenes". No omitas ninguna. Una escena = una cabecera (INT/EXT + locación + DÍA/NOCHE). Si el guion tiene 20 escenas, devuelves 20 objetos en "scenes".

FORMATO DE SALIDA:
Devuelves ÚNICAMENTE un JSON válido con un objeto que tenga un array "scenes". Sin markdown, sin \`\`\`json, sin texto antes ni después. Solo el JSON.

ESTRUCTURA DE CADA ESCENA (formato Scene Breakdown Sheet tipo Movie Magic):
- sceneNumber: string — exactamente como en el guion ("1", "2", "2A", "10B").
- intExt: "INT" o "EXT" (solo interior o exterior; estándar industria).
- dayNight: "DÍA", "NOCHE", "AMANECER" o "ATARDECER".
- sceneHeading: string — cabecera "LOCACIÓN - ESPACIO" (ej. "DIARIO EL CARIBE - OFICINA PACHO", "CASA DE MARÍA - SALA").
- pageEighths: number — OCTAVOS de página (entero). Ver reglas abajo.
- synopsis: string — 1 a 3 líneas: qué pasa, quién está, conflicto o acción. Que un lector entienda la escena sin leer el guion.
- scriptPage: number (opcional) — página del guion donde empieza la escena, si se identifica.
- elements: array de objetos con "category" y "name". OBLIGATORIO en todas las escenas; nunca vacío. Cast obligatorio en cada escena.

OCTAVOS DE PÁGINA (1/8ths) — CRÍTICO:
${totalPages != null ? `El guion tiene ${totalPages} páginas en total. Distribuye los octavos de cada escena proporcionalmente basándote en la longitud del texto de cada escena relativa al texto total.` : 'El número total de páginas no se ha indicado. Distribuye los octavos proporcionalmente basándote en la longitud del texto de cada escena relativa al texto total.'}

En industria cada página del guion se divide en 8 partes (aprox. 1 pulgada). 1 página = 8 octavos. Se usa para estimar tiempo de pantalla y de rodaje (ej. ~5 páginas/día en diálogo típico).
- Devuelves siempre un ENTERO en pageEighths (ej. 5, 8, 11, 14). La UI mostrará "1 3/8" cuando pageEighths = 11.
- Referencia por longitud real del texto:
  * Escena corta (4–6 líneas): 3–5 octavos.
  * Media página: 4 octavos. Cuarto de página: 2. Tres cuartos: 6.
  * Una página llena: 8 octavos.
  * Página y media: 12. Dos páginas: 16.
- NO infles: si la escena es claramente menos de una página, no uses 8. Estima por LONGITUD REAL.
- Casos que pesan más (usa más octavos): stunts, multitudes, locaciones complejas, persecuciones, efectos prácticos, actuaciones musicales. Una línea tipo "X interpreta una canción" puede ser 2–3 min de pantalla → 16–24 octavos (2–3 páginas equivalentes).

CAST (PERSONAJES) — CRÍTICO:
En CADA escena lista en elements TODOS los personajes que: aparecen en escena (acción o diálogo), hablan (aunque sea una línea) o son nombrados/referidos de forma relevante.
- category: siempre "cast".
- name: nombre tal cual en el guion. Puedes usar:
  * Nombre solo: "Catalina", "Pacho Martínez".
  * Nombre + edad entre paréntesis: "Catalina (17)".
  * Nombre + rol/nota: "Pacho Martínez (Director Diario El Caribe)".
- CONSISTENCIA: el mismo personaje debe llevar el MISMO nombre en todas las escenas (ej. siempre "Pacho Martínez", no "Pacho" en una y "Pacho Martínez" en otra). Así el sistema cuenta apariciones y asigna número (1 = el que más sale). No omitas a nadie; el protagonista debe estar en elements en TODAS sus escenas.

EXTRAS Y CANTIDADES:
- extras: figuración, bits y atmósfera (ej. "restaurante lleno", "escritores del diario"). Si el guion indica CANTIDAD, inclúyela en el name entre paréntesis: "Escritores Diario el Caribe (20)".

CATEGORÍAS PERMITIDAS (claves exactas en minúsculas): ${categoriesList}

USO POR CATEGORÍA (sé exhaustivo):
- cast: siempre en cada escena (al menos los que aparecen/hablan).
- extras: cuando aplique; cantidad en name si se conoce.
- stunts: acción física, peleas, caídas, persecuciones, conducción extrema.
- spfx: efectos prácticos (humo, lluvia, fuego, sangre, explosiones prácticas).
- vfx: efectos digitales, pantalla verde, CGI.
- utileria: objetos que se usan o se ven (premios en estantes, fotografías en oficina, teléfono, taza, etc.).
- vestuario, maq_pelo, maq_fx, arte: cuando sean relevantes o se mencionen (maquillaje general → maq_pelo; FX de caracterización → maq_fx).
- vehiculos, armas, animales: si aparecen o se mencionan.
- coordinacion_intimidad: escenas de intimidad que requieran coordinación.
- fotografia, sonido, musica, fotografias: cámara, sonido directo, música diegética, fotos/ref. en utilería o arte (fotografías = imágenes como objeto en escena).
- observaciones: notas de producción que no encajen en otra categoría.

UNA ESCENA = UNA CABECERA. Si cambia locación o momento, es otra escena. Cortes dentro del mismo lugar y momento pueden ser una sola escena con varios elements.

EJEMPLOS:

1) Escena corta (poco más de media página), pageEighths 5:
{"sceneNumber":"1","intExt":"INT","dayNight":"DÍA","synopsis":"David come solo en el comedor, perdido en sus pensamientos. Nadie más en casa.","pageEighths":5,"sceneHeading":"COMEDOR - CASA FAMILIA","scriptPage":1,"elements":[{"category":"cast","name":"David"},{"category":"utileria","name":"Plato"},{"category":"utileria","name":"Cubiertos"},{"category":"arte","name":"Comedor amueblado"}]}

2) Escena oficina con diálogo, extras con cantidad, utilería y fotografías (1 3/8 = 11 octavos):
{"sceneNumber":"311","intExt":"INT","dayNight":"DÍA","synopsis":"Catalina quiere ser candidata al reinado de periódicos. Pacho, emocionado, la anima y acepta.","pageEighths":11,"sceneHeading":"DIARIO EL CARIBE - OFICINA PACHO","scriptPage":14,"elements":[{"category":"cast","name":"Catalina (17)"},{"category":"cast","name":"Pacho Martínez (Director Diario El Caribe)"},{"category":"extras","name":"Escritores Diario el Caribe (20)"},{"category":"utileria","name":"Premios en estantes"},{"category":"utileria","name":"Fotografías en oficina"},{"category":"fotografias","name":"Fotografías de Pacho junto a personalidades"},{"category":"fotografias","name":"Fotos de anteriores candidatas al reinado"}]}

3) Escena de acción (stunts y efectos):
{"sceneNumber":"5","intExt":"EXT","dayNight":"NOCHE","synopsis":"Persecución en coche; el villano embiste; choque y explosión. Ana sale del vehículo.","pageEighths":14,"sceneHeading":"CARRETERA - NOCHE","scriptPage":3,"elements":[{"category":"cast","name":"Ana"},{"category":"cast","name":"Villano"},{"category":"stunts","name":"Persecución en vehículo"},{"category":"stunts","name":"Choque"},{"category":"spfx","name":"Explosión práctica"},{"category":"vfx","name":"Fuego y humo (post)"},{"category":"vehiculos","name":"Coche Ana"},{"category":"vehiculos","name":"Coche villano"}]}

${totalPages != null && totalPages > 0 ? `OCTAVOS — REGLA ESTRICTA: El guion tiene ${totalPages} páginas. La suma de todos los pageEighths de todas las escenas debe ser exactamente ${totalPages * 8}. Distribuye los octavos proporcionalmente: escena corta (1-5 líneas) = 1-3 octavos, escena media (6-15 líneas) = 4-6 octavos, escena larga (16+ líneas) = 7-16 octavos. Verifica antes de responder que la suma total cuadre con el número de páginas.` : 'OCTAVOS — REGLA: Distribuye los octavos proporcionalmente: escena corta (1-5 líneas) = 1-3 octavos, escena media (6-15 líneas) = 4-6 octavos, escena larga (16+ líneas) = 7-16 octavos.'}

Responde ÚNICAMENTE con el JSON: {"scenes": [ ... ]}. Cada escena con todos los campos obligatorios, elements nunca vacío, cast completo, pageEighths entero según longitud real del texto.`

  const useGpt4 = Boolean(body.useGpt4)
  const model = useGpt4 ? 'gpt-4o' : 'gpt-4o-mini'
  const userContent = text.slice(0, MAX_SCRIPT_CHARS)
  console.log('[parse-script] Calling OpenAI', model, 'with', userContent.length, 'chars...')

  try {
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

    console.log('[parse-script] OpenAI response status:', res.status)

    if (!res.ok) {
      const err = await res.text()
      console.error('[parse-script] OpenAI error:', res.status, err.slice(0, 300))
      return NextResponse.json(
        {
          error: 'Error de OpenAI',
          details: err.slice(0, 500),
          hint: 'Revisa OPENAI_API_KEY (debe ser API key de platform.openai.com, no de ChatGPT).',
        },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { total_tokens?: number }
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      console.error('[parse-script] OpenAI returned empty content')
      return NextResponse.json(
        { error: 'Respuesta vacía de OpenAI', details: 'El modelo no devolvió texto.' },
        { status: 502 }
      )
    }

    const cleaned = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed = JSON.parse(cleaned) as { scenes?: unknown[] }
    if (!Array.isArray(parsed.scenes)) {
      console.error('[parse-script] Response missing scenes array. Content preview:', cleaned.slice(0, 200))
      return NextResponse.json(
        { error: 'Formato de respuesta inválido', details: 'Falta el array "scenes" en el JSON.' },
        { status: 502 }
      )
    }
    console.log('[parse-script] OpenAI OK, escenas recibidas:', parsed.scenes.length, 'usage:', data.usage?.total_tokens ?? '?')

    // Normalizar categorías y filtrar elementos inválidos
    let scenes = parsed.scenes.map((s: unknown) => {
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
      if (pageEighths > 128) pageEighths = 128
      pageEighths = Math.round(pageEighths)
      const sceneNumber = String(scene.sceneNumber ?? '')
      const hasCast = elements.some((el) => el.category === 'cast')
      if (!hasCast && elements.length === 0) {
        console.warn('[parse-script] Escena', sceneNumber, 'sin elementos ni cast')
      } else if (!hasCast) {
        console.warn('[parse-script] Escena', sceneNumber, 'sin cast en elements')
      }
      return {
        ...scene,
        sceneNumber: sceneNumber || undefined,
        sceneHeading: scene.sceneHeading ?? scene.set ?? '',
        scriptPage: typeof scene.scriptPage === 'number' ? scene.scriptPage : null,
        pageEighths,
        elements,
      }
    })

    // Endurecer: si una escena no tiene cast, inferir desde synopsis o añadir placeholder
    const synopsisKey = 'synopsis'
    for (const scene of scenes) {
      const elements = (scene as { elements?: Array<{ category: string; name: string }> }).elements ?? []
      const hasCast = elements.some((el) => el.category === 'cast')
      if (hasCast) continue
      const synopsis = String((scene as Record<string, unknown>)[synopsisKey] ?? '').trim()
      const inferred = inferCastFromSynopsis(synopsis)
      const castToAdd = inferred.length > 0 ? inferred : ['Personaje (revisar)']
      for (const name of castToAdd) {
        elements.push({ category: 'cast', name: name.slice(0, 200) })
      }
      if (inferred.length === 0) {
        console.warn('[parse-script] Escena sin cast: se añadió placeholder. Synopsis:', synopsis.slice(0, 80))
      } else {
        console.log('[parse-script] Escena sin cast: se inferieron', castToAdd.length, 'nombres desde synopsis')
      }
    }

    // Recalcular pageEighths por proporción de caracteres (reemplaza el valor de la IA)
    const totalOctavos =
      totalPages != null && totalPages > 0 ? totalPages * 8 : scenes.length * 4
    const charCounts = scenes.map((s) => {
      const syn = String((s as Record<string, unknown>).synopsis ?? '')
      const names =
        (s as { elements?: Array<{ name: string }> }).elements
          ?.map((e) => e.name)
          .join(' ') ?? ''
      return syn.length + names.length
    })
    const totalChars = charCounts.reduce((a, b) => a + b, 0)
    if (totalChars > 0) {
      scenes = scenes.map((s, i) => ({
        ...s,
        pageEighths: Math.max(
          1,
          Math.round((charCounts[i]! / totalChars) * totalOctavos)
        ),
      })) as typeof scenes
      const sumExceptLast = scenes
        .slice(0, -1)
        .reduce((a, s) => a + (s as { pageEighths: number }).pageEighths, 0)
      const lastIdx = scenes.length - 1
      if (lastIdx >= 0) {
        scenes[lastIdx] = {
          ...scenes[lastIdx],
          pageEighths: Math.max(1, totalOctavos - sumExceptLast),
        } as (typeof scenes)[number]
      }
    }

    return NextResponse.json({ scenes })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[parse-script] Exception:', e)
    return NextResponse.json(
      {
        error: 'Error al parsear guion',
        details: message,
        hint: message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
          ? 'Error de red. Comprueba conexión a internet y que api.openai.com sea accesible.'
          : 'Revisa la consola del servidor (terminal donde corre npm run dev) para más detalle.',
      },
      { status: 500 }
    )
  }
}
