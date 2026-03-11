import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPdfBuffer } from '@/lib/pdf/extract-text'

/**
 * POST /api/extract-pdf
 * Acepta multipart con campo "file" (PDF). Extrae texto en el servidor.
 * Requiere autenticación. Usado por el diálogo "Importar guion" cuando suben un PDF.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Envía el PDF en el campo "file"' },
        { status: 400 }
      )
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un PDF' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const text = await extractTextFromPdfBuffer(buffer)
    return NextResponse.json({ text })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Error al extraer texto del PDF', details: message },
      { status: 500 }
    )
  }
}
