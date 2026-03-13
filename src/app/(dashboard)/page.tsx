import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus, FolderKanban, FileText, Calendar, LayoutGrid } from 'lucide-react'

const linkButtonClass =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'

export default function DashboardPage() {
  const headerActions = (
    <Link href="/projects/new" className={linkButtonClass}>
      <Plus className="size-4" />
      Nuevo proyecto
    </Link>
  )
  return (
    <>
      <PageHeader
        title="Inicio"
        description="Desglose, stripboard y plan de rodaje para tu producción"
        actions={headerActions}
      />
      <div className="mt-10">
        <p className="max-w-xl text-muted-foreground">
          Crea un proyecto para comenzar el desglose de escenas, gestión de
          cast y locaciones, y el stripboard.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/projects"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
          >
            <FolderKanban className="size-4" />
            Ver proyectos
          </Link>
        </div>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Desglose',
            description: 'Escenas, elementos por categoría y flags.',
            icon: FileText,
            href: '/projects',
          },
          {
            title: 'Stripboard',
            description: 'Ordena por set, locación y día/noche.',
            icon: LayoutGrid,
            href: '/projects',
          },
          {
            title: 'Calendario',
            description: 'Días de rodaje, company travel y reportes.',
            icon: Calendar,
            href: '/projects',
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/20 hover:bg-card"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </p>
            </Link>
          )
        })}
      </div>
    </>
  )
}
