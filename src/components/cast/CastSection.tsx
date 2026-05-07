'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CastMember = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  notes: string | null
  appearance_count?: number
  appearance_scene_numbers?: string[]
}

export function CastSection({
  projectId,
  initialCastMembers,
}: {
  projectId: string
  initialCastMembers: CastMember[]
}) {
  const [castMembers, setCastMembers] = useState<CastMember[]>(initialCastMembers ?? [])
  const [loadingList, setLoadingList] = useState(false)
  const [editing, setEditing] = useState<CastMember | null>(null)
  const [characterName, setCharacterName] = useState('')
  const [actorName, setActorName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Usar datos del servidor (tienen apariciones y orden correcto). Solo refetch si no hay datos o no hay apariciones.
  const hasGoodInitialData =
    initialCastMembers.length > 0 &&
    initialCastMembers.some((c) => (c.appearance_count ?? 0) > 0)

  useEffect(() => {
    if (initialCastMembers.length > 0) {
      setCastMembers(initialCastMembers)
    }
    if (hasGoodInitialData) return
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    setLoadingList(true)
    const load = (isRetry = false) => {
      fetch(`/api/projects/${projectId}/cast-members`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: { castMembers?: CastMember[] }) => {
          if (cancelled) return
          if (!Array.isArray(data.castMembers)) return
          const list = data.castMembers
          const hasAppearances = list.some((c) => (c.appearance_count ?? 0) > 0)
          setCastMembers((prev) =>
            list.length > 0 && (hasAppearances || prev.length === 0) ? list : prev
          )
          if (list.length === 0 && !isRetry) {
            retryTimer = setTimeout(() => {
              if (!cancelled) load(true)
            }, 800)
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingList(false)
        })
    }
    load()
    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [projectId, hasGoodInitialData, initialCastMembers])

  const openEdit = (c: CastMember) => {
    setEditing(c)
    setCharacterName(c.character_name ?? '')
    setActorName(c.actor_name ?? '')
    setNotes(c.notes ?? '')
    setSaveError(null)
  }

  const closeEdit = () => {
    setEditing(null)
    setCharacterName('')
    setActorName('')
    setNotes('')
    setSaving(false)
    setSaveError(null)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()
    const nextName = characterName.trim()
    const nextActor = actorName.trim() || null
    const nextNotes = notes.trim() || null
    if (!nextName) {
      setSaving(false)
      setSaveError('El nombre del personaje es obligatorio.')
      return
    }
    const oldName = editing.character_name

    const { error } = await supabase
      .from('cast_members')
      .update({ actor_name: nextActor, notes: nextNotes })
      .eq('id', editing.id)
      .eq('project_id', projectId)
    setSaving(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    // Si cambió el nombre, actualizar también el elemento "cast" en breakdown_elements (para que no se pierda al re-sync).
    if (oldName.trim() !== nextName.trim()) {
      await supabase
        .from('breakdown_elements')
        .update({ name: nextName })
        .eq('project_id', projectId)
        .eq('category', 'cast')
        .eq('name', oldName)
    }
    await supabase
      .from('cast_members')
      .update({ character_name: nextName })
      .eq('id', editing.id)
      .eq('project_id', projectId)

    setCastMembers((prev) =>
      prev.map((m) =>
        m.id === editing.id
          ? { ...m, character_name: nextName, actor_name: nextActor, notes: nextNotes }
          : m
      )
    )
    closeEdit()
  }

  return (
    <div className="mt-6 space-y-4">
      {loadingList ? (
        <p className="text-sm text-muted-foreground">Cargando cast...</p>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  #
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Personaje
                </th>
                <th className="px-4 py-3 text-right font-medium text-foreground tabular-nums">
                  Apariciones
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground min-w-[180px]">
                  Escenas
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Actor
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody>
              {castMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No hay personajes. El cast se genera desde el desglose al importar el guion o usar &quot;Rehacer desglose con IA&quot; en Desglose.
                  </td>
                </tr>
              ) : (
                castMembers.map((c) => (
                  <tr
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') openEdit(c)
                    }}
                    className="border-b border-border/80 transition-colors hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {c.cast_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <span className="hover:underline underline-offset-4">
                        {c.character_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {c.appearance_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground leading-snug max-w-md">
                      {(c.appearance_scene_numbers?.length ?? 0) > 0
                        ? c.appearance_scene_numbers!.join(', ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.actor_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.notes ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing != null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing?.character_name ?? 'Personaje'}</DialogTitle>
            {editing ? (
              <p className="text-sm text-muted-foreground">
                Edita el actor y las notas sin salir del flujo.
              </p>
            ) : null}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cast-name">Personaje</Label>
              <Input
                id="cast-name"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Nombre del personaje"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cast-actor">Actor</Label>
              <Input
                id="cast-actor"
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="Nombre del actor (opcional)"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cast-notes">Notas</Label>
              <textarea
                id="cast-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Disponibilidad, comentarios, casting, etc."
                className="min-h-[140px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={6}
                disabled={saving}
              />
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
