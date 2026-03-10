import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'project-scripts'

export async function POST(
  request: Request,
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
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()
    if (!project) {
      return NextResponse.json({ error: 'Proyecto no encontrado o sin permiso' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Envía el PDF en el campo "file"' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 })
    }

    const path = `${projectId}/script.pdf`
    const admin = createAdminClient()
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), { upsert: true, contentType: file.type })

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { error: updateErr } = await admin
      .from('projects')
      .update({
        script_file_path: path,
        script_file_name: file.name,
      })
      .eq('id', projectId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
