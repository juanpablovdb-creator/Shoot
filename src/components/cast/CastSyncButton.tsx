'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function CastSyncButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      }
      if (!res.ok) {
        setError(data.error ?? data.details ?? 'Error al sincronizar')
        return
      }
      setMessage(data.message ?? 'Elenco sincronizado.')
      router.refresh()
      setTimeout(() => window.location.reload(), 400)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
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
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
