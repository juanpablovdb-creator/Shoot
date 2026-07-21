import { NextResponse } from 'next/server'

/**
 * GET /api/health/anthropic
 *
 * Comprueba que ANTHROPIC_API_KEY está configurada y que la API responde.
 * Hace UNA petición mínima para que aparezca en el dashboard de uso de Anthropic.
 */
export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey || apiKey.trim() === '') {
    return NextResponse.json(
      {
        ok: false,
        error: 'ANTHROPIC_API_KEY no está definida',
        hint: 'Añade ANTHROPIC_API_KEY en .env.local y reinicia el servidor (npm run dev).',
      },
      { status: 500 }
    )
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Di solo: OK' }],
      }),
    })

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>
      error?: { message?: string }
      usage?: { input_tokens?: number; output_tokens?: number }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Anthropic API rechazó la petición',
          details: data.error?.message ?? JSON.stringify(data).slice(0, 400),
          status: res.status,
        },
        { status: 502 }
      )
    }

    const content = data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim()
    const usage = data.usage
      ? {
          total_tokens: (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
        }
      : undefined
    return NextResponse.json({
      ok: true,
      message: 'Anthropic API responde correctamente',
      response: content || '(vacío)',
      usage,
      hint: 'Si ves usage, la petición llegó a Anthropic. Revisa el dashboard de Usage (puede tardar unos minutos en actualizar).',
    })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Error al conectar con Anthropic',
        details: e instanceof Error ? e.message : String(e),
        hint: 'Comprueba tu conexión y que ANTHROPIC_API_KEY sea una clave válida de API (empieza por sk-ant-).',
      },
      { status: 500 }
    )
  }
}
