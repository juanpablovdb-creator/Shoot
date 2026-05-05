import { NextResponse } from 'next/server'

/**
 * GET /api/health/openai
 *
 * Comprueba que OPENAI_API_KEY está configurada y que la API responde.
 * Hace UNA petición mínima (1 token) para que aparezca en el dashboard de uso de OpenAI.
 */
export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      {
        ok: false,
        error: 'OPENAI_API_KEY no está definida',
        hint: 'Añade OPENAI_API_KEY en .env.local y reinicia el servidor (npm run dev).',
      },
      { status: 500 }
    )
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Di solo: OK' }],
        max_tokens: 5,
      }),
    })

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string }
      usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'OpenAI API rechazó la petición',
          details: data.error?.message ?? (await res.text()),
          status: res.status,
        },
        { status: 502 }
      )
    }

    const content = data.choices?.[0]?.message?.content?.trim()
    return NextResponse.json({
      ok: true,
      message: 'OpenAI API responde correctamente',
      response: content ?? '(vacío)',
      usage: data.usage
        ? {
            total_tokens: data.usage.total_tokens,
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
          }
        : undefined,
      hint: 'Si ves usage, la petición llegó a OpenAI. Revisa el dashboard de Usage (puede tardar unos minutos en actualizar).',
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al conectar con OpenAI',
        details: e instanceof Error ? e.message : String(e),
        hint: 'Comprueba tu conexión y que OPENAI_API_KEY sea una clave válida de API (no una sesión del navegador).',
      },
      { status: 500 }
    )
  }
}
