import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus } from 'lucide-react'
import { ProjectsList } from './ProjectsList'
import { createClient } from '@/lib/supabase/server'

const linkButtonClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let hasProjects = false
  if (user?.id) {
    const { count } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
    hasProjects = (count ?? 0) > 0
  }

  const headerActions = hasProjects ? (
    <Link href="/projects/new" className={linkButtonClass}>
      <Plus className="size-4" />
      Nuevo proyecto
    </Link>
  ) : undefined

  return (
    <>
      <PageHeader
        title="Proyectos"
        description={
          hasProjects
            ? 'Lista de producciones'
            : 'Crea tu primer proyecto para importar guion y desglose.'
        }
        actions={headerActions}
      />
      <div className="mt-6">
        <ProjectsList />
      </div>
    </>
  )
}
