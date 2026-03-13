'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  createScenesFromParsed,
  type ParsedScene,
} from '@/lib/breakdown-import'

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
    let scriptTotalPages: number | undefined

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
        const formData = new FormData()
        formData.set('file', pdfFile)
        const extractRes = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: formData,
        })
        const extractData = (await extractRes.json()) as {
          text?: string
          totalPages?: number
          error?: string
          details?: string
        }
        if (!extractRes.ok) {
          setError(
            extractData.error ?? 'No se pudo extraer texto del PDF.'
              + (extractData.details ? ` ${extractData.details}` : '')
          )
          setLoading(false)
          return
        }
        const extractedText = (extractData.text ?? '').trim()
        scriptTotalPages = extractData.totalPages
        if (!extractedText) {
          setError('El PDF no tiene texto extraíble (puede ser solo imágenes). Prueba pegar el texto del guion.')
          setLoading(false)
          return
        }
        res = await fetch('/api/parse-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: extractedText, projectId }),
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

      const { inserted, skipped } = await createScenesFromParsed(projectId, scenes, {
        saveScriptContent: !isPdf && textToSend ? textToSend : undefined,
        scriptTotalPages,
      })
      await fetch(`/api/projects/${projectId}/sync-cast`, { method: 'POST' })

      setCreated(inserted)
      router.refresh()
      if (inserted > 0) {
        setTimeout(() => {
          setOpen(false)
          setText('')
          setPdfFile(null)
          setCreated(null)
        }, 1500)
      } else if (skipped > 0) {
        setError(
          `${skipped} escena${skipped !== 1 ? 's' : ''} ya existían. No se duplicaron. Cierra y revisa el desglose.`
        )
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
