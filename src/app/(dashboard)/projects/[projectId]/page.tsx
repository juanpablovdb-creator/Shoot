import Link from 'next/link'
import { FileText } from 'lucide-react'

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return (
    <div className="rounded-lg border bg-card p-6">
      <h2 className="text-lg font-semibold">Vista general</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Desde aquí puedes ir al desglose de escenas, gestionar cast y
        locaciones, y trabajar en el stripboard.
      </p>
      <Link
        href={`/projects/${projectId}/breakdown`}
        className="mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
      >
        <FileText className="size-4" />
        Ir al desglose
      </Link>
    </div>
  )
}
