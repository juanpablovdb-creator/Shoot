'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROJECT_TYPES } from '@/lib/constants/project-types'
import type { ProjectType } from '@/types'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('serie_plataforma')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? ''
    const { data, error: err } = await supabase
      .from('projects')
      .insert({
        name,
        code: code || null,
        project_type: projectType,
        user_id: userId,
      })
      .select('id')
      .single()
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    if (data?.id) router.push(`/projects/${data.id}`)
  }

  return (
    <>
      <PageHeader
        title="Nuevo proyecto"
        description="Crear una nueva producción"
        actions={
          <Link href="/projects" className={cn(buttonVariants({ variant: 'outline' }))}>
            Volver
          </Link>
        }
      />
      <Card className="mt-6 max-w-xl">
        <CardHeader>
          <CardTitle>Información básica</CardTitle>
          <CardDescription>
            Nombre, código y tipo de proyecto para el desglose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del proyecto</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Mi serie 2025"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código (opcional)</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: EDLLB"
                maxLength={12}
              />
              <p className="text-xs text-muted-foreground">
                Identificador corto para documentación, call sheets y reportes (p. ej. siglas del proyecto).
              </p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de proyecto</Label>
              <Select
                value={projectType}
                onValueChange={(v) => setProjectType(v as ProjectType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_TYPES) as ProjectType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PROJECT_TYPES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear proyecto'}
              </Button>
              <Link href="/projects" className={cn(buttonVariants({ variant: 'outline' }))}>
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
