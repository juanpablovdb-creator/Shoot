'use client'

import { useState, useEffect } from 'react'
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
import { extractTextFromPdf } from '@/lib/pdf-utils'
import type { BreakdownCategoryKey } from '@/types'

const DEFAULT_LOCATION_NAME = 'Locaciones del guion'

interface ParsedElement {
  category: string
  name: string
}

interface ParsedScene {
  sceneNumber?: string
  intExt?: string
  dayNight?: string
  synopsis?: string
  pageEighths?: number
  sceneHeading?: string
  scriptPage?: number | null
  elements?: ParsedElement[]
}

export function ImportScriptDialog({
  projectId,
  triggerClassName,
  initialText = '',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  projectId: string
  triggerClassName?: string
  initialText?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (v: boolean) => {
    if (isControlled) controlledOnOpenChange?.(v)
    else setInternalOpen(v)
  }
  const [text, setText] = useState(initialText)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<number | null>(null)

  useEffect(() => {
    if (open) {
      setText(initialText)
      setPdfFile(null)
    }
  }, [open, initialText])

  async function handleImport() {
    let textToSend = text.trim()
    let isPdf = false

    if (pdfFile) {
      isPdf = true
      textToSend = ''
    }
    if (!textToSend && !pdfFile) {
      setError('Sube un PDF o pega el texto del guion.')
      return
    }

    setLoading(true)
    setError(null)
    setCreated(null)
    try {
      let res: Response
      if (pdfFile) {
        // Extraer texto en el navegador (evita el worker de PDF en el servidor)
        let extractedText: string
        try {
          extractedText = await extractTextFromPdf(pdfFile)
        } catch (e) {
          setError(`No se pudo extraer texto del PDF. ${e instanceof Error ? e.message : String(e)}`)
          setLoading(false)
          return
        }
        if (!extractedText.trim()) {
          setError('El PDF no tiene texto extraíble (puede ser solo imágenes). Prueba pegar el texto del guion.')
          setLoading(false)
          return
        }
        res = await fetch('/api/parse-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText.trim(), projectId }),
        })
      } else {
        res = await fetch('/api/parse-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSend }),
        })
      }

      const data = await res.json()
      if (!res.ok) {
        const msg = data.error ?? 'Error al parsear el guion'
        setError(data.details ? `${msg} ${data.details}` : msg)
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

      const { data: locs } = await supabase
        .from('locations')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', DEFAULT_LOCATION_NAME)
        .limit(1)
      let defaultLocationId = locs?.[0]?.id
      if (!defaultLocationId) {
        const { data: newLoc } = await supabase
          .from('locations')
          .insert({ project_id: projectId, name: DEFAULT_LOCATION_NAME })
          .select('id')
          .single()
        defaultLocationId = newLoc?.id ?? null
      }

      const setIdsByHeading: Record<string, string> = {}
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
        const sceneHeading = (s.sceneHeading ?? '').trim().slice(0, 200)
        const elements = Array.isArray(s.elements) ? s.elements : []

        let setId: string | null = null
        if (sceneHeading && defaultLocationId) {
          if (setIdsByHeading[sceneHeading]) {
            setId = setIdsByHeading[sceneHeading]
          } else {
            const { data: existingSet } = await supabase
              .from('sets')
              .select('id')
              .eq('project_id', projectId)
              .eq('location_id', defaultLocationId)
              .eq('name', sceneHeading)
              .limit(1)
              .single()
            if (existingSet?.id) {
              setId = existingSet.id
              setIdsByHeading[sceneHeading] = existingSet.id
            } else {
              const { data: newSet } = await supabase
                .from('sets')
                .insert({
                  project_id: projectId,
                  location_id: defaultLocationId,
                  name: sceneHeading,
                })
                .select('id')
                .single()
              if (newSet?.id) {
                setId = newSet.id
                setIdsByHeading[sceneHeading] = newSet.id
              }
            }
          }
        }

        const hasStunts = elements.some((el) => el.category === 'stunts')
        const hasSfx = elements.some((el) => el.category === 'spfx')
        const hasVfx = elements.some((el) => el.category === 'vfx')

        const { data: newScene, error: insertErr } = await supabase
          .from('scenes')
          .insert({
            project_id: projectId,
            scene_number: sceneNumber,
            scene_number_sort: nextSort,
            int_ext: intExt,
            day_night: dayNight,
            synopsis: (s.synopsis ?? '').slice(0, 500) || null,
            page_eighths: pageEighths,
            set_id: setId,
            has_stunts: hasStunts,
            has_sfx: hasSfx,
            has_vfx: hasVfx,
          })
          .select('id')
          .single()

        if (insertErr || !newScene?.id) continue

        inserted++
        nextSort++

        for (const el of elements) {
          const cat = el.category as BreakdownCategoryKey
          const name = el.name.slice(0, 500)
          if (!name) continue

          const { data: existingEl } = await supabase
            .from('breakdown_elements')
            .select('id')
            .eq('project_id', projectId)
            .eq('category', cat)
            .eq('name', name)
            .limit(1)
            .single()

          let elementId = existingEl?.id
          if (!elementId) {
            const { data: newEl } = await supabase
              .from('breakdown_elements')
              .insert({
                project_id: projectId,
                category: cat,
                name,
              })
              .select('id')
              .single()
            elementId = newEl?.id
          }
          if (elementId) {
            await supabase.from('scene_elements').insert({
              scene_id: newScene.id,
              breakdown_element_id: elementId,
            })
          }
        }
      }

      if (!isPdf && textToSend && inserted > 0) {
        await supabase
          .from('projects')
          .update({ script_content: textToSend.slice(0, 500000) })
          .eq('id', projectId)
      }

      setCreated(inserted)
      if (inserted > 0) {
        router.refresh()
        setTimeout(() => {
          setOpen(false)
          setText('')
          setPdfFile(null)
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
        onClick={() => setOpen(true)}
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
            Sube un PDF o pega el texto. La IA hará el desglose tipo Movie Magic:
            escenas con Set, INT/EXT, DÍA/NOCHE, sinopsis, páginas y elementos por
            categoría.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">PDF</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".pdf"
                className="block w-full text-sm text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
              {pdfFile && (
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {pdfFile.name}
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                o pega texto
              </span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="1. INT. CASA - DÍA&#10;María entra..."
            className="min-h-[140px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> en
            .env.local (GPT-4o-mini).
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {created != null && created > 0 && (
            <p className="text-sm text-green-600">
              Se guardó el guion y se crearon {created} escena
              {created !== 1 ? 's' : ''}.
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
              {loading ? 'Procesando...' : 'Parsear y crear desglose'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
