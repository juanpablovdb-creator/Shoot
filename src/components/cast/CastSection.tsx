'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

type CastMember = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  availability_notes: string | null
}

export function CastSection({
  projectId,
  initialCastMembers,
}: {
  projectId: string
  initialCastMembers: CastMember[]
}) {
  const router = useRouter()
  const [castMembers, setCastMembers] = useState<CastMember[]>(initialCastMembers ?? [])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedCastRef = useRef(false)

  useEffect(() => {
    if (initialCastMembers.length > 0) {
      hasLoadedCastRef.current = true
      setCastMembers(initialCastMembers)
      return
    }
    // Si ya tenemos elenco en estado (p. ej. tras sincronizar), no mostrar "Cargando..." para no ocultar la tabla
    if (hasLoadedCastRef.current) {
      setLoadingList(false)
      return
    }
    let cancelled = false
    setLoadingList(true)
    fetch(`/api/projects/${projectId}/cast-members`)
      .then((res) => res.json())
      .then((data: { castMembers?: CastMember[] }) => {
        if (!cancelled && Array.isArray(data.castMembers)) {
          hasLoadedCastRef.current = true
          setCastMembers(data.castMembers)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, initialCastMembers])

  async function handleSync() {
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/sync-cast`, {
        method: 'POST',
      })
      const data = (await res.json()) as {
        ok?: boolean
        message?: string
        error?: string
        details?: string
        castMembers?: CastMember[]
      }
      if (!res.ok) {
        setError(data.error ?? data.details ?? 'Error al sincronizar')
        return
      }
      setMessage(data.message ?? 'Elenco sincronizado.')
      if (Array.isArray(data.castMembers)) {
        hasLoadedCastRef.current = true
        setCastMembers(data.castMembers)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const hasCast = castMembers.length > 0

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleSync}
          disabled={loading}
        >
          {loading ? (
            <>Sincronizando...</>
          ) : (
            <>
              <RefreshCw className="size-4" />
              Sincronizar elenco desde desglose
            </>
          )}
        </Button>
        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      {loadingList ? (
        <p className="text-sm text-muted-foreground">Cargando elenco...</p>
      ) : !hasCast ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            No hay personajes en el elenco. Si ya importaste el guion y tienes
            escenas en el Desglose, pulsa &quot;Sincronizar elenco desde
            desglose&quot; para generar el elenco desde los personajes (Cast) del
            desglose.
          </p>
          <p>
            Si el desglose tampoco tiene cast, ve a Desglose y usa &quot;Rehacer
            desglose con IA&quot; para que la IA vuelva a analizar el guion y
            rellene los personajes por escena.
          </p>
        </div>
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
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Actor / Notas
                </th>
              </tr>
            </thead>
            <tbody>
              {castMembers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/80 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {c.cast_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.character_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.actor_name ?? c.availability_notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
