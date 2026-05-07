'use client'

import { useMemo, useState } from 'react'
import { BREAKDOWN_CATEGORIES, BREAKDOWN_CATEGORY_ORDER } from '@/lib/constants/categories'
import type { BreakdownCategoryKey } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download } from 'lucide-react'

export function BreakdownDownloadsDialog({ projectId }: { projectId: string }) {
  const keys = useMemo(
    () => BREAKDOWN_CATEGORY_ORDER as BreakdownCategoryKey[],
    []
  )
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(keys))
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(keys))
  const clearAll = () => setSelected(new Set())

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/export/breakdown-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: [...selected] }),
      })
      if (!res.ok) {
        const t = await res.text()
        setError(t.slice(0, 200))
        setDownloading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'desglose.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Download className="size-4" />
        Descargar desglose
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Descargar desglose (PDF)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escoge qué categorías incluir en el PDF.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} disabled={downloading}>
                Todo
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll} disabled={downloading}>
                Nada
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {keys.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(k)}
                    onChange={() => toggle(k)}
                    disabled={downloading}
                    className="rounded border-input"
                  />
                  <span>{BREAKDOWN_CATEGORIES[k].label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={downloading}>
              Cancelar
            </Button>
            <Button onClick={download} disabled={downloading}>
              {downloading ? 'Generando PDF…' : 'Descargar PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

