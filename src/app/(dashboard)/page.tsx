import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, FileText, Calendar, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type ProjectRow = {
  id: string
  name: string
  code: string | null
  script_file_path: string | null
  script_content: string | null
  created_at: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const projectsRes = user?.id
    ? await supabase
        .from('projects')
        .select('id, name, code, script_file_path, script_content, created_at')
        .order('created_at', { ascending: false })
    : { data: [] as ProjectRow[], error: null as unknown }

  const projects = ((projectsRes as { data?: ProjectRow[] }).data ?? []) as ProjectRow[]

  const [scenesRes, castRes] = user?.id
    ? await Promise.all([
        supabase.from('scenes').select('project_id'),
        supabase.from('cast_members').select('project_id'),
      ])
    : [{ data: [] as Array<{ project_id: string }>, error: null }, { data: [] as Array<{ project_id: string }>, error: null }]

  const scenesByProject = new Map<string, number>()
  for (const r of (scenesRes.data ?? []) as Array<{ project_id: string }>) {
    scenesByProject.set(r.project_id, (scenesByProject.get(r.project_id) ?? 0) + 1)
  }
  const castByProject = new Map<string, number>()
  for (const r of (castRes.data ?? []) as Array<{ project_id: string }>) {
    castByProject.set(r.project_id, (castByProject.get(r.project_id) ?? 0) + 1)
  }

  const scriptsUploaded = projects.filter((p) => Boolean(p.script_file_path)).length
  const inPlan = projects.filter((p) => (scenesByProject.get(p.id) ?? 0) > 0).length

  const statCardClass =
    'rounded-xl border-border/60 bg-card shadow-none hover:bg-muted/20 transition-colors'
  const statLabelClass =
    'flex items-center gap-2 text-[13px] font-medium text-muted-foreground'
  const statNumberClass =
    'text-2xl font-semibold tracking-tight tabular-nums text-foreground'
  const statDescClass = 'mt-2 text-[13px] leading-snug text-muted-foreground'

  const headerActions = (
    <Link
      href="/projects/new"
      className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'gap-2 shadow-none')}
    >
      <Plus className="size-4" />
      Nuevo proyecto
    </Link>
  )
  return (
    <>
      <PageHeader
        title="Inicio"
        description="Guiones, desglose y plan de rodaje"
        actions={headerActions}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className={statLabelClass}>
              <FileText className="size-4" />
              Guiones subidos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={statNumberClass}>{scriptsUploaded}</p>
            <p className={statDescClass}>Proyectos con PDF del guion.</p>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className={statLabelClass}>
              <LayoutGrid className="size-4" />
              En tu plan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={statNumberClass}>{inPlan}/3</p>
            <p className={statDescClass}>Plan gratuito (guiones con escenas importadas).</p>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className={statLabelClass}>
              <Calendar className="size-4" />
              Proyectos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={statNumberClass}>{projects.length}</p>
            <p className={statDescClass}>Total de producciones.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Tus guiones</h2>
          <Link
            href="/projects"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'shadow-none'
            )}
          >
            Ver proyectos
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Crea un proyecto para subir un guion y generar el desglose.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const scenesCount = scenesByProject.get(p.id) ?? 0
              const castCount = castByProject.get(p.id) ?? 0
              const hasPdf = Boolean(p.script_file_path)
              const hasText = Boolean(p.script_content?.trim())
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="group rounded-xl border border-border/60 bg-card p-5 shadow-none transition-colors hover:bg-muted/15 hover:border-primary/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.code ? `${p.code} · ` : ''}
                        {p.name}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hasPdf ? 'PDF cargado' : 'Sin PDF'} · {hasText ? 'Texto listo' : 'Sin texto'} ·{' '}
                        {scenesCount > 0 ? `${scenesCount} escenas` : '0 escenas'} ·{' '}
                        {castCount > 0 ? `${castCount} personajes` : '0 personajes'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-muted/25 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {scenesCount > 0 ? 'Listo' : hasPdf ? 'Pendiente' : 'Nuevo'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
