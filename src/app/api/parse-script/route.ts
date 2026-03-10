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

  const systemPrompt = `Eres un experto en desglose de guiones (breakdown) para producción audiovisual, estilo Movie Magic / StudioBinder. Analizas guiones en español y generas un JSON con todas las escenas y sus elementos.

REGLAS ESTRICTAS:
1) Devuelves ÚNICAMENTE un JSON con un objeto que tenga un array "scenes". Nada de markdown, ni \`\`\`json, ni texto antes o después.
2) Cada escena debe tener:
   - sceneNumber: string — número de escena tal como en el guion ("1", "2", "2A", "10B", etc.)
   - intExt: "INT" o "EXT" (interior o exterior)
   - dayNight: "DÍA", "NOCHE", "AMANECER" o "ATARDECER"
   - synopsis: string breve (1-2 líneas) describiendo qué pasa en la escena
   - pageEighths: number — octavos de página que ocupa la escena (4 = media página, 8 = una página completa). Si no se indica, estima según la longitud del texto de la escena.
   - sceneHeading: string — cabecera tal como en el guion: "LOCACIÓN - LUGAR ESPECÍFICO" (ej. "CASA DE MARÍA - SALA", "CALLE PRINCIPAL - DÍA", "RESTAURANTE - COCINA")
   - scriptPage: number (opcional) — número de página del guion donde empieza la escena, si es identificable
   - elements: array de objetos con "category" y "name"

3) Categorías permitidas (usa exactamente estas claves en minúsculas): ${categoriesList}

4) Cómo rellenar elements:
   - cast: personajes con diálogo o nombre. Formato "N. Nombre (descripción)" si hay número de personaje, si no "Nombre personaje"
   - figurantes / extras: gente de fondo con cantidad cuando se indique, ej. "Clientes del bar (8)", "Meseros (2)"
   - utileria: objetos que se usan o se ven (props)
   - vestuario: prendas o looks relevantes por personaje
   - arte: decoración, set dressing, carteles, atrezzo visible
   - vehiculos: coches, motos, barcos, etc. que aparezcan
   - stunts: acrobacias, peleas, caídas; spfx: efectos prácticos (humo, fuego); vfx: efectos digitales
   - armas, animales, coordinacion_intimidad: cuando apliquen
   - grafica_archivo: pantallas, periódicos, fotos que se vean; musica: si se especifica una canción o tipo de música
   Incluye TODOS los elementos que se mencionen o se infieran en la escena.

5) Una escena = una cabecera de escena (INT/EXT, LOCACIÓN, DÍA/NOCHE). Si el guion tiene cortes dentro del mismo lugar (ej. diferentes ángulos), puede ser una sola escena con varios elements; si cambia locación o momento, es otra escena.

EJEMPLO de una escena en el JSON:
{"sceneNumber":"1","intExt":"INT","dayNight":"DÍA","synopsis":"María llega al bar y pide un café. Habla con el mesero.","pageEighths":12,"sceneHeading":"BAR LA ESQUINA - INTERIOR","scriptPage":1,"elements":[{"category":"cast","name":"María"},{"category":"cast","name":"Mesero"},{"category":"figurantes","name":"Clientes (3)"},{"category":"utileria","name":"Taza café"},{"category":"arte","name":"Bar con estantes"}]}

Responde ÚNICAMENTE con el JSON: {"scenes": [ ... ]}, sin ningún otro texto.`

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

    // Normalizar categorías y filtrar elementos inválidos
    const scenes = parsed.scenes.map((s: unknown) => {
      const scene = s as Record<string, unknown>
      const elements = Array.isArray(scene.elements)
        ? (scene.elements as Array<{ category?: string; name?: string }>)
            .map((el) => {
              const cat = String(el?.category ?? '').toLowerCase().trim()
              const name = String(el?.name ?? '').trim()
              if (!name) return null
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
