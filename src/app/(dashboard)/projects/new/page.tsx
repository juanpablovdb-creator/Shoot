'use client'

import { useState, useRef } from 'react'
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
import { Upload, FileUp } from 'lucide-react'

const BUCKET = 'project-scripts'
const SCRIPT_PATH = (projectId: string) => `${projectId}/script.pdf`

function storageErrorMessage(err: { message: string }): string {
  const m = err.message.toLowerCase()
  if (m.includes('case not found') || m.includes('bucket not found') || m.includes('not found'))
    return `El bucket "${BUCKET}" no existe. Créalo en Supabase → Storage → New bucket (nombre exacto: ${BUCKET}).`
  return err.message
}

export default function NewProjectPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [projectType, setProjectType] = useState<ProjectType>('serie_plataforma')
  const [scriptFile, setScriptFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scriptFile || scriptFile.type !== 'application/pdf') {
      setError('Debes subir el PDF del guion.')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.id) {
      setError('Debes iniciar sesión para crear un proyecto.')
      setLoading(false)
      return
    }
    const createRes = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        code: code || null,
        project_type: projectType,
      }),
    })
    const text = await createRes.text()
    let createJson: { id?: string; error?: string; code?: string; details?: string } = {}
    if (text) {
      try {
        createJson = JSON.parse(text) as typeof createJson
      } catch {
        setError('Respuesta inválida del servidor')
        setLoading(false)
        return
      }
    }
    if (!createRes.ok) {
      const msg = createJson.error ?? 'No se pudo crear el proyecto'
      const extra = [createJson.code, createJson.details].filter(Boolean).join(' — ')
      setError(extra ? `${msg} (${extra})` : msg)
      setLoading(false)
      return
    }
    const projectId = createJson.id
    if (!projectId) {
      setLoading(false)
      return
    }
    const formData = new FormData()
    formData.set('file', scriptFile)
    const uploadRes = await fetch(`/api/projects/${projectId}/upload-script`, {
      method: 'POST',
      body: formData,
    })
    const uploadJson = (await uploadRes.json()) as { error?: string }
    if (!uploadRes.ok) {
      setError(uploadJson.error ?? 'Error al subir el PDF')
      setLoading(false)
      return
    }
    setLoading(false)
    router.push(`/projects/${projectId}`)
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
            <div className="space-y-2">
              <Label htmlFor="script-pdf">
                Guion (PDF) <span className="text-destructive">*</span>
              </Label>
              <input
                ref={fileInputRef}
                id="script-pdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setScriptFile(e.target.files?.[0] ?? null)}
                required
                className="hidden"
              />
              <label
                htmlFor="script-pdf"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-8 transition-colors hover:bg-muted/50"
              >
                {scriptFile ? (
                  <>
                    <FileUp className="size-10 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-foreground">
                      {scriptFile.name}
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Haz clic para cambiar el PDF
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="size-10 text-muted-foreground" />
                    <span className="mt-2 text-sm font-medium text-foreground">
                      Subir PDF del guion
                    </span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      Solo archivos PDF. Obligatorio para crear el proyecto.
                    </span>
                  </>
                )}
              </label>
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
