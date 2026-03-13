import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { BreakdownCategoryKey } from '@/types'
import { BREAKDOWN_CATEGORY_KEYS } from '@/lib/constants/categories'

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
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Falta OPENAI_API_KEY en .env.local. Usa GPT-4o-mini para mejor costo.',
      },
      { status: 500 }
    )
  }

  let body: { text?: string; projectId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo JSON inválido. Envía { "text": "..." }.' },
      { status: 400 }
    )
  }
  const text = body.text?.trim() ?? ''
  if (body.projectId && typeof body.projectId === 'string' && text) {
    const supabase = await createClient()
    await supabase
      .from('projects')
      .update({ script_content: text.slice(0, 500000) })
      .eq('id', body.projectId)
  }

  if (!text) {
    return NextResponse.json(
      { error: 'Texto del guion vacío.' },
      { status: 400 }
    )
  }

  const categoriesList = BREAKDOWN_CATEGORY_KEYS.join(', ')

  const systemPrompt = `Eres un ASSISTENTE DE DIRECCIÓN EXPERTO para cine y televisión en Latinoamérica. Tu trabajo es hacer un DESGLOSE DE PRODUCCIÓN (breakdown) profesional de cada guion: escena por escena, con todos los elementos que la dirección y producción necesitan para planificar rodaje, presupuesto y plan de trabajo. Estilo Movie Magic / StudioBinder. El desglose debe ser COMPLETO y PRECISO: de él depende el cálculo de días de rodaje, cantidad de apariciones por personaje, y la lista de elementos por categoría.

FORMATO DE SALIDA:
Devuelves ÚNICAMENTE un JSON válido con un objeto que tenga un array "scenes". Sin markdown, sin \`\`\`json, sin texto antes ni después. Solo el JSON.

ESTRUCTURA DE CADA ESCENA (todos los campos obligatorios salvo scriptPage):
- sceneNumber: string — exactamente como en el guion ("1", "2", "2A", "10B").
- intExt: "INT" o "EXT".
- dayNight: "DÍA", "NOCHE", "AMANECER" o "ATARDECER".
- synopsis: string — 1 a 3 líneas claras: qué pasa, quién está, conflicto o acción principal. Que un lector entienda la escena sin leer el guion.
- pageEighths: number — OCTAVOS de página que ocupa la escena en el guion.
  * 1 página = 8 octavos. Media página = 4. Cuarto de página = 2.
  * Estima por LONGITUD REAL del texto: escena de 4–6 líneas = 3–5 octavos; una página llena = 8; página y media = 12; dos páginas = 16. NUNCA pongas 8 si la escena es claramente corta (menos de una página).
- sceneHeading: string — cabecera de escena: "LOCACIÓN - ESPACIO ESPECÍFICO" (ej. "CASA DE MARÍA - SALA", "CALLE PRINCIPAL - DÍA").
- scriptPage: number (opcional) — página del guion donde empieza la escena, si se identifica.
- elements: array de objetos con "category" y "name". OBLIGATORIO en todas las escenas; nunca vacío.

CAST (PERSONAJES) — CRÍTICO PARA EL DESGLOSE:
En CADA escena debes listar en elements TODOS los personajes que:
- Aparecen en escena (acción o diálogo).
- Hablan (aunque sea una línea).
- Son nombrados o referidos de forma relevante en la escena.
Usa category "cast" y name con el nombre del personaje tal como en el guion. Si el guion indica edad (ej. "Abuelo (74)"), puedes usar "Abuelo (74)" como name para referencia; si no, "Abuelo". La consistencia de nombres entre escenas permite calcular bien la cantidad de apariciones por personaje. No omitas a nadie: un desglose sin cast completo no sirve para producción.

CATEGORÍAS PERMITIDAS (claves exactas en minúsculas): ${categoriesList}

ELEMENTOS POR CATEGORÍA (sé exhaustivo):
- cast: siempre al menos los personajes que salen/hablan en la escena.
- figurantes, extras: cuando se indiquen o se infieran (ej. "restaurante lleno", "gente en la calle").
- stunts: peleas, caídas, persecuciones, acción física, conducción extrema.
- spfx: efectos prácticos (humo, lluvia, fuego práctico, sangre, explosiones prácticas).
- vfx: efectos digitales, pantalla verde, CGI, composición.
- utileria: objetos que se usan o se ven (teléfono, taza, armas de utilería, etc.).
- vestuario, maquillaje, arte: cuando sean relevantes o se mencionen.
- vehiculos, armas, animales: si aparecen o se mencionan.
- coordinacion_intimidad: escenas de intimidad que requieran coordinación.
- musica, grafica_archivo: cuando se indiquen.

UNA ESCENA = UNA CABECERA (INT/EXT + LOCACIÓN + DÍA/NOCHE). Si cambia locación o momento, es otra escena. Cortes dentro del mismo lugar pueden ser una sola escena con varios elements.

EJEMPLOS DE ESCENAS BIEN DESGLOSADAS:

Escena corta (poco más de media página):
{"sceneNumber":"1","intExt":"INT","dayNight":"DÍA","synopsis":"David come solo en el comedor, perdido en sus pensamientos. Nadie más en casa.","pageEighths":5,"sceneHeading":"COMEDOR - CASA FAMILIA","scriptPage":1,"elements":[{"category":"cast","name":"David"},{"category":"utileria","name":"Plato"},{"category":"utileria","name":"Cubiertos"},{"category":"arte","name":"Comedor amueblado"}]}

Escena con diálogo y vehículo:
{"sceneNumber":"2","intExt":"EXT","dayNight":"DÍA","synopsis":"David abre el portón. Adriana llega en un auto viejo; se bajan y hablan en la entrada.","pageEighths":8,"sceneHeading":"FACHADA CASA - ENTRADA","scriptPage":1,"elements":[{"category":"cast","name":"David"},{"category":"cast","name":"Adriana"},{"category":"vehiculos","name":"Auto viejo"}]}

Escena de acción (stunts y efectos):
{"sceneNumber":"5","intExt":"EXT","dayNight":"NOCHE","synopsis":"Persecución en coche; el villano embiste; choque y explosión. Ana sale del vehículo.","pageEighths":14,"sceneHeading":"CARRETERA - NOCHE","scriptPage":3,"elements":[{"category":"cast","name":"Ana"},{"category":"cast","name":"Villano"},{"category":"stunts","name":"Persecución en vehículo"},{"category":"stunts","name":"Choque"},{"category":"spfx","name":"Explosión práctica"},{"category":"vfx","name":"Fuego y humo (post)"},{"category":"vehiculos","name":"Coche Ana"},{"category":"vehiculos","name":"Coche villano"}]}

Responde ÚNICAMENTE con el JSON: {"scenes": [ ... ]}. Cada escena con elements rellenado (cast obligatorio por cada personaje que aparezca o hable), synopsis clara, pageEighths según longitud real del texto, y el resto de categorías cuando apliquen.`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text.slice(0, MAX_SCRIPT_CHARS) },
        ],
        temperature: 0.2,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: 'Error de OpenAI', details: err },
        { status: 502 }
      )
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return NextResponse.json(
        { error: 'Respuesta vacía de OpenAI' },
        { status: 502 }
      )
    }

    const parsed = JSON.parse(content) as { scenes?: unknown[] }
    if (!Array.isArray(parsed.scenes)) {
      return NextResponse.json(
        { error: 'Formato de respuesta inválido' },
        { status: 502 }
      )
    }

    const CAT_ALIASES: Record<string, BreakdownCategoryKey> = {
      personajes: 'cast',
      characters: 'cast',
    }
    // Normalizar categorías y filtrar elementos inválidos
    const scenes = parsed.scenes.map((s: unknown) => {
      const scene = s as Record<string, unknown>
      const elements = Array.isArray(scene.elements)
        ? (scene.elements as Array<{ category?: string; name?: string }>)
            .map((el) => {
              let cat = String(el?.category ?? '').toLowerCase().trim()
              const name = String(el?.name ?? '').trim()
              if (!name) return null
              if (CAT_ALIASES[cat]) cat = CAT_ALIASES[cat]
              const validCat: BreakdownCategoryKey | null = VALID_CATEGORIES.has(cat)
                ? (cat as BreakdownCategoryKey)
                : null
              if (!validCat) return null
              return { category: validCat, name }
            })
            .filter(Boolean) as Array<{ category: string; name: string }>
        : []
      return {
        ...scene,
        sceneHeading: scene.sceneHeading ?? scene.set ?? '',
        scriptPage: typeof scene.scriptPage === 'number' ? scene.scriptPage : null,
        elements,
      }
    })

    return NextResponse.json({ scenes })
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Error al parsear guion',
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}
