import Link from 'next/link'
import { FileText, Calendar, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Vista general</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            Estas herramientas viven dentro del proyecto.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Desglose',
            description: 'Escenas, elementos por categoría y flags.',
            icon: FileText,
            href: `/projects/${projectId}/breakdown`,
          },
          {
            title: 'Stripboard',
            description: 'Ordena por set, locación y día/noche.',
            icon: LayoutGrid,
            href: `/projects/${projectId}/stripboard`,
          },
          {
            title: 'Calendario',
            description: 'Días de rodaje, traslados de unidad y reportes.',
            icon: Calendar,
            href: `/projects/${projectId}/calendar`,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.title}
              href={item.href}
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/20"
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
    </div>
  )
}
