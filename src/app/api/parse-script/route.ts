import { NextResponse } from 'next/server'

/**
 * POST /api/parse-script
 * Parsea un guion (texto) y devuelve escenas detectadas (número, INT/EXT, DÍA/NOCHE, sinopsis).
 *
 * IA recomendada por costo: OpenAI GPT-4o-mini.
 * Configura OPENAI_API_KEY en .env.local.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Falta OPENAI_API_KEY en .env.local. Usa GPT-4o-mini para mejor costo.',
      },
      { status: 500 }
    )
  }

  let body: { text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo JSON inválido. Envía { "text": "..." }.' },
      { status: 400 }
    )
  }

  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json(
      { error: 'Campo "text" vacío o ausente.' },
      { status: 400 }
    )
  }

  const systemPrompt = `Eres un asistente que analiza guiones y extrae escenas.
Devuelves un JSON con un array "scenes". Cada escena tiene:
- sceneNumber: string (ej. "1", "2A", "3")
- intExt: "INT" o "EXT"
- dayNight: "DÍA", "NOCHE", "AMANECER" o "ATARDECER"
- synopsis: string breve (máximo 2 líneas)
- pageEighths: number (octavos de página; 8 = 1 página)

Responde ÚNICAMENTE con el JSON, sin markdown ni texto extra.`

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
          { role: 'user', content: text.slice(0, 12000) },
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

    return NextResponse.json({ scenes: parsed.scenes })
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
