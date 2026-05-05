'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PROJECT_TYPES } from '@/lib/constants/project-types'
import { cn } from '@/lib/utils'
import { MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'

async function loadProjects(): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, code, project_type, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data as Project[]) ?? []
}

export function ProjectsList() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editProject, setEditProject] = useState<{ id: string; name: string } | null>(null)
  const [editName, setEditName] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deleteProject, setDeleteProject] = useState<{ id: string; name: string } | null>(null)
  const [deleteConfirming, setDeleteConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    loadProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    loadProjects()
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
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
      <div className="flex min-h-[min(70vh,560px)] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-foreground">Aún no tienes proyectos</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Crea uno para importar el guion, hacer el desglose y armar el stripboard.
        </p>
        <Link
          href="/projects/new"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'mt-8 gap-2 shadow-md'
          )}
        >
          <Plus className="size-5" />
          Nuevo proyecto
        </Link>
      </div>
    )
  }

  const openEdit = (p: Project) => {
    setEditProject({ id: p.id, name: p.name })
    setEditName(p.name)
  }
  const closeEdit = () => {
    setEditProject(null)
    setEditSaving(false)
  }
  const saveEdit = async () => {
    if (!editProject || !editName.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/projects/${editProject.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      refresh()
      closeEdit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setEditSaving(false)
    }
  }

  const openDelete = (p: Project) => {
    setDeleteError(null)
    // Abrir el diálogo en el siguiente tick para que el menú dropdown cierre antes
    // y el estado no se pierda por el cierre del menú (Base UI).
    setTimeout(() => setDeleteProject({ id: p.id, name: p.name }), 0)
  }
  const closeDelete = () => {
    setDeleteProject(null)
    setDeleteConfirming(false)
    setDeleteError(null)
  }
  const confirmDelete = async () => {
    if (!deleteProject) return
    setDeleteConfirming(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/projects/${deleteProject.id}`, { method: 'DELETE' })
      const data = res.headers.get('content-type')?.includes('json') ? await res.json() : {}
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Error al eliminar')
      refresh()
      closeDelete()
      router.push('/projects')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setDeleteConfirming(false)
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Card
            key={p.id}
            className="rounded-xl border-border shadow-sm transition-all hover:border-primary/20 hover:shadow"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/projects/${p.id}`}
                  className="min-w-0 flex-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                >
                  <CardTitle className="text-base font-semibold">{p.name}</CardTitle>
                  <CardDescription>
                    {p.code && `${p.code} · `}
                    {PROJECT_TYPES[p.project_type]?.label ?? p.project_type}
                  </CardDescription>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
                      'shrink-0'
                    )}
                    onClick={(e) => e.preventDefault()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Opciones</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={(itemProps) => (
                        <button
                          type="button"
                          {...itemProps}
                          className={cn(
                            'flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none',
                            itemProps.className
                          )}
                          onClick={(e) => {
                            setTimeout(() => openEdit(p), 0)
                            typeof itemProps.onClick === 'function' && itemProps.onClick(e)
                          }}
                        />
                      )}
                    >
                      <Pencil className="size-4" />
                      Editar nombre
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      render={(itemProps) => (
                        <button
                          type="button"
                          {...itemProps}
                          className={cn(
                            'flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-sm outline-none text-destructive',
                            itemProps.className
                          )}
                          onClick={(e) => {
                            setTimeout(() => openDelete(p), 0)
                            typeof itemProps.onClick === 'function' && itemProps.onClick(e)
                          }}
                        />
                      )}
                    >
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!editProject} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Editar nombre del proyecto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="project-name">Nombre</Label>
            <Input
              id="project-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nombre del proyecto"
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={!editName.trim() || editSaving}>
              {editSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteProject} onOpenChange={(open) => !open && closeDelete()}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <p className="text-sm text-muted-foreground">
              ¿Eliminar &quot;{deleteProject?.name}&quot;? Esta acción no se puede deshacer.
            </p>
            {deleteError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={closeDelete} disabled={deleteConfirming}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirming}
            >
              {deleteConfirming ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
