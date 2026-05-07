'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type CastMemberRow = {
  id: string
  project_id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  notes: string | null
}

export default function CastMemberDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const castMemberId = params.castMemberId as string

  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<CastMemberRow | null>(null)

  const [actorName, setActorName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('cast_members')
      .select('id, project_id, character_name, cast_number, actor_name, notes')
      .eq('id', castMemberId)
      .eq('project_id', projectId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }
        const r = data as CastMemberRow
        setRow(r)
        setActorName(r.actor_name ?? '')
        setNotes(r.notes ?? '')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [castMemberId, projectId, supabase])

  async function handleSave() {
    if (!row) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('cast_members')
      .update({
        actor_name: actorName.trim() || null,
        notes: notes.trim() || null,
      })
      .eq('id', castMemberId)
      .eq('project_id', projectId)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push(`/projects/${projectId}/cast`)
    router.refresh()
  }

  return (
    <>
      <PageHeader
        title={row ? row.character_name : 'Personaje'}
        description="Editar actor y notas del personaje."
        actions={
          <Link
            href={`/projects/${projectId}/cast`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            Volver
          </Link>
        }
      />

      <Card className="mt-6 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Ficha del personaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : row == null ? (
            <p className="text-sm text-destructive">{error ?? 'No encontrado.'}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">#</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {row.cast_number}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground">Personaje</p>
                  <p className="text-sm font-semibold text-foreground">{row.character_name}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actorName">Actor</Label>
                <Input
                  id="actorName"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="Nombre del actor (opcional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Disponibilidad, comentarios, casting, etc."
                  className="min-h-[140px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={6}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </Button>
                <Link
                  href={`/projects/${projectId}/cast`}
                  className={cn(buttonVariants({ variant: 'outline' }))}
                >
                  Cancelar
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}

