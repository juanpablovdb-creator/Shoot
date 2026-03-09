'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface ParsedScene {
  sceneNumber?: string
  intExt?: string
  dayNight?: string
  synopsis?: string
  pageEighths?: number
}

export function ImportScriptDialog({
  projectId,
  triggerClassName,
}: {
  projectId: string
  triggerClassName?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<number | null>(null)

  async function handleImport() {
    const trimmed = text.trim()
    if (!trimmed) {
      setError('Escribe o pega el texto del guion.')
      return
    }
    setLoading(true)
    setError(null)
    setCreated(null)
    try {
      const res = await fetch('/api/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al parsear el guion')
        setLoading(false)
        return
      }
      const scenes = (data.scenes ?? []) as ParsedScene[]
      if (scenes.length === 0) {
        setError('No se detectaron escenas en el texto.')
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('scenes')
        .select('scene_number_sort')
        .eq('project_id', projectId)
        .order('scene_number_sort', { ascending: false })
        .limit(1)
        .single()
      let nextSort = (existing?.scene_number_sort ?? 0) + 1
      let inserted = 0
      for (const s of scenes) {
        const sceneNumber = String(s.sceneNumber ?? inserted + 1)
        const intExt = (s.intExt === 'EXT' ? 'EXT' : 'INT') as 'INT' | 'EXT'
        const dayNight = ['DÍA', 'NOCHE', 'AMANECER', 'ATARDECER'].includes(
          s.dayNight ?? ''
        )
          ? (s.dayNight as 'DÍA' | 'NOCHE' | 'AMANECER' | 'ATARDECER')
          : 'DÍA'
        const pageEighths = Math.max(1, Math.min(128, Number(s.pageEighths) || 8))
        const { error: insertErr } = await supabase.from('scenes').insert({
          project_id: projectId,
          scene_number: sceneNumber,
          scene_number_sort: nextSort,
          int_ext: intExt,
          day_night: dayNight,
          synopsis: (s.synopsis ?? '').slice(0, 500) || null,
          page_eighths: pageEighths,
          has_stunts: false,
          has_sfx: false,
          has_vfx: false,
        })
        if (!insertErr) {
          inserted++
          nextSort++
        }
      }
      setCreated(inserted)
      if (inserted > 0) {
        router.refresh()
        setTimeout(() => {
          setOpen(false)
          setText('')
          setCreated(null)
        }, 1500)
      } else {
        setError('No se pudieron crear escenas en la base de datos.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className={triggerClassName}>
            <FileText className="size-4" />
            Importar guion
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar guion</DialogTitle>
          <DialogDescription>
            Pega el texto del guion. La IA detectará escenas (INT/EXT, DÍA/NOCHE, sinopsis y páginas).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ejemplo:&#10;&#10;1. INT. CASA - DÍA&#10;María entra por la puerta...&#10;&#10;2. EXT. CALLE - NOCHE&#10;..."
            className="min-h-[180px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
            rows={8}
          />
          <p className="text-xs text-muted-foreground">
            Necesitas <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> en .env.local (modelo GPT-4o-mini).
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {created != null && created > 0 && (
            <p className="text-sm text-green-600">
              Se crearon {created} escena{created !== 1 ? 's' : ''}.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={loading}>
              {loading ? 'Parseando y creando...' : 'Parsear y crear escenas'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
