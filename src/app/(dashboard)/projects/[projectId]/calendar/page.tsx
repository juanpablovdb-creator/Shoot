import { PageHeader } from '@/components/shared/PageHeader'

export const dynamic = 'force-dynamic'

export default async function ProjectCalendarPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <>
      <PageHeader
        title="Calendario"
        description="Días de rodaje, traslados de unidad y reportes (próximamente)."
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10">
        <p className="text-sm text-muted-foreground">
          Este módulo está en construcción. Mientras tanto, puedes trabajar en{' '}
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href={`/projects/${projectId}/stripboard`}
          >
            Stripboard
          </a>{' '}
          y{' '}
          <a
            className="underline underline-offset-4 hover:text-foreground"
            href={`/projects/${projectId}/breakdown`}
          >
            Desglose
          </a>
          .
        </p>
      </div>
    </>
  )
}

