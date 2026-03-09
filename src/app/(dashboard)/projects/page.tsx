import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus } from 'lucide-react'
import { ProjectsList } from './ProjectsList'

const linkButtonClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'

export default function ProjectsPage() {
  const headerActions = (
    <Link href="/projects/new" className={linkButtonClass}>
      <Plus className="size-4" />
      Nuevo proyecto
    </Link>
  )
  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Lista de producciones"
        actions={headerActions}
      />
      <div className="mt-6">
        <ProjectsList />
      </div>
    </>
  )
}
