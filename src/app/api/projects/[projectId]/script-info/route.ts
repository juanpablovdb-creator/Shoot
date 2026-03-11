import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPdfPageCountFromBuffer } from '@/lib/pdf/extract-text'

const BUCKET = 'project-scripts'

/**
 * GET /api/projects/[projectId]/script-info
 * Devuelve { pageCount } del PDF del proyecto (solo servidor, sin pdfjs-dist en cliente).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'projectId obligatorio' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, script_file_path')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project?.script_file_path) {
      return NextResponse.json(
        { error: 'El proyecto no tiene un PDF de guion subido' },
        { status: 404 }
      )
    }

    const admin = createAdminClient()
    const { data: blob, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(project.script_file_path)

    if (downloadError || !blob) {
      return NextResponse.json(
        { error: downloadError?.message ?? 'No se pudo descargar el PDF' },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const pageCount = await getPdfPageCountFromBuffer(buffer)
    return NextResponse.json({ pageCount })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { error: 'Error al leer el PDF', details: message },
      { status: 500 }
    )
  }
}
