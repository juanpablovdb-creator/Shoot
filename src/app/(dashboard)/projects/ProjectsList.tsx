'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types'
import { LoadingState } from '@/components/shared/LoadingState'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PROJECT_TYPES } from '@/lib/constants/project-types'

export function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('projects')
      .select('id, name, code, project_type, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        setLoading(false)
        if (err) {
          setError(err.message)
          return
        }
        setProjects((data as Project[]) ?? [])
      })
  }, [])

  if (loading) return <LoadingState message="Cargando proyectos..." />
  if (error) {
    return (
      <p className="text-destructive">
        Error al cargar proyectos: {error}
      </p>
    )
  }

  if (projects.length === 0) {
    return (
      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle>Sin proyectos</CardTitle>
          <CardDescription>
            Crea tu primer proyecto para comenzar el desglose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/projects/new"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Crear proyecto
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <Link key={p.id} href={`/projects/${p.id}`}>
          <Card className="rounded-xl border-border shadow-sm transition-all hover:border-primary/20 hover:shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
              <CardDescription>
                {p.code && `${p.code} · `}
                {PROJECT_TYPES[p.project_type]?.label ?? p.project_type}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  )
}
