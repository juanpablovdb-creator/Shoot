import { PageHeader } from '@/components/shared/PageHeader'
import { BreakdownSheet } from '@/components/breakdown/BreakdownSheet'
import type { BreakdownSheetProps } from '@/components/breakdown/BreakdownSheet'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function BreakdownPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, script_content, script_file_path, script_file_name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) notFound()

  const { data: scenes } = await supabase
    .from('scenes')
    .select(
      `
      id,
      scene_number,
      scene_number_sort,
      int_ext,
      day_night,
      synopsis,
      page_eighths,
      has_stunts,
      has_sfx,
      has_vfx,
      sets ( id, name, locations ( id, name ) ),
      scene_cast ( cast_members ( id, character_name, cast_number ) ),
      scene_elements ( breakdown_elements ( id, name, category ) )
    `
    )
    .eq('project_id', projectId)
    .order('scene_number_sort', { ascending: true })

  return (
    <>
      <PageHeader
        title="Desglose"
        description="Escenas y elementos del proyecto"
      />
      <div className="mt-6">
        <BreakdownSheet
          projectId={projectId}
          projectName={project.name}
          initialScriptContent={project.script_content ?? ''}
          initialScriptFilePath={project.script_file_path ?? null}
          initialScriptFileName={project.script_file_name ?? null}
          initialScenes={(scenes ?? []) as unknown as BreakdownSheetProps['initialScenes']}
        />
      </div>
    </>
  )
}
