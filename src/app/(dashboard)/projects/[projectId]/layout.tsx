import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  FileText,
  Users,
  MapPin,
  Calendar,
  LayoutGrid,
  ChevronRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const nav = [
  { href: 'breakdown', label: 'Desglose', icon: FileText },
  { href: 'elements', label: 'Elementos', icon: LayoutGrid },
  { href: 'cast', label: 'Cast', icon: Users },
  { href: 'locations', label: 'Sets', icon: MapPin },
  { href: 'stripboard', label: 'Stripboard', icon: LayoutGrid },
  { href: 'calendar', label: 'Calendario', icon: Calendar },
]

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, code')
    .eq('id', projectId)
    .single()

  if (error || !project) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Proyectos
        </Link>
        <ChevronRight className="size-4" />
        <span className="text-foreground">
          {project.code ? `${project.code} · ` : ''}
          {project.name}
        </span>
      </div>
      <nav className="flex flex-wrap gap-2">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={`/projects/${projectId}/${item.href}`}
              prefetch={false}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/20 hover:bg-muted/50"
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </div>
  )
}
