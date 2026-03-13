'use client'

import { useState, useEffect } from 'react'

type CastMember = {
  id: string
  character_name: string
  cast_number: number
  actor_name: string | null
  availability_notes: string | null
  appearance_count?: number
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

  // Refrescar cast desde la API al montar (sin cache); un reintento si llega vacío (p. ej. tras desglose)
  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    if (initialCastMembers.length > 0) {
      setCastMembers(initialCastMembers)
    } else {
      setLoadingList(true)
    }
    const load = (isRetry = false) => {
      fetch(`/api/projects/${projectId}/cast-members`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((data: { castMembers?: CastMember[] }) => {
          if (cancelled) return
          if (!Array.isArray(data.castMembers)) return
          const list = data.castMembers
          setCastMembers((prev) => (list.length > 0 ? list : prev.length > 0 ? prev : list))
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
  }, [projectId])

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
                  Cantidad de apariciones
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Actor / Notas
                </th>
              </tr>
            </thead>
            <tbody>
              {castMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No hay personajes. El cast se genera desde el desglose al importar el guion o usar &quot;Rehacer desglose con IA&quot; en Desglose.
                  </td>
                </tr>
              ) : (
                castMembers.map((c) => (
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
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {c.appearance_count ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.actor_name ?? c.availability_notes ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
