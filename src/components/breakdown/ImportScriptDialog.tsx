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
import type { ParsedScene } from '@/lib/breakdown-import'

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
  const [openaiCheck, setOpenaiCheck] = useState<string | null>(null)

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
          body: JSON.stringify({
            text: extractedText,
            projectId,
            ...(scriptTotalPages != null && { totalPages: scriptTotalPages }),
          }),
        })
      } else {
        const estimatedPages = Math.max(1, Math.round(textToSend.length / 3000))
        res = await fetch('/api/parse-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSend,
            projectId,
            totalPages: estimatedPages,
          }),
        })
        scriptTotalPages = estimatedPages
      }

      const data = await res.json() as {
        error?: string
        details?: string
        hint?: string
        scenes?: unknown[]
      }
      if (!res.ok) {
        const msg = data.error ?? 'Error al parsear el guion'
        const parts = [msg, data.details, data.hint].filter(Boolean)
        setError(parts.join(' · '))
        setLoading(false)
        return
      }
      const scenes = (data.scenes ?? []) as ParsedScene[]
      if (scenes.length === 0) {
        setError('No se detectaron escenas en el texto.')
        setLoading(false)
        return
      }

      const importRes = await fetch(`/api/projects/${projectId}/breakdown/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes,
          scriptTotalPages,
          saveScriptContent: !isPdf && textToSend ? textToSend : undefined,
        }),
      })
      const importData = await importRes.json() as {
        inserted?: number
        skipped?: number
        errors?: string[]
        error?: string
        details?: string
      }
      if (!importRes.ok) {
        const parts = [
          importData.error ?? 'Error al importar desglose',
          importData.details,
        ].filter(Boolean)
        setError(parts.join(' · '))
        setLoading(false)
        return
      }
      const { inserted = 0, skipped = 0, errors: importErrors = [] } = importData

      setCreated(inserted)
      router.refresh()
      if (inserted > 0) {
        if (importErrors?.length) {
          setError(
            `Se crearon ${inserted} escenas. Algunos avisos: ${importErrors.slice(0, 3).join('; ')}${importErrors.length > 3 ? '...' : ''}`
          )
        }
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
        setError(
          importErrors?.length
            ? `No se crearon escenas. ${importErrors.slice(0, 2).join(' ')}`
            : 'No se pudieron crear escenas en la base de datos.'
        )
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
          <DialogDescription className="space-y-2 text-left">
            <span className="block">
              Sube un PDF o pega el texto. La IA hará el desglose tipo Movie Magic.
              En guiones largos puede tardar varios minutos (varias pasadas por trozos de
              escena completas).
            </span>
            <span className="block text-xs text-muted-foreground">
              <strong className="text-foreground">Extras</strong> = multitudes / atmósfera (
              &quot;restaurante lleno&quot;).{' '}
              <strong className="text-foreground">Figuración</strong> = bits con función (
              mesero, taxista sin línea, etc.). Van en categorías distintas.
            </span>
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
            .env.local para usar la IA de parseo del guion.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={loading}
              onClick={async () => {
                setOpenaiCheck(null)
                try {
                  const r = await fetch('/api/health/openai')
                  const d = await r.json()
                  if (d.ok) {
                    setOpenaiCheck(`OK. Tokens usados: ${d.usage?.total_tokens ?? '—'}. El uso puede tardar unos minutos en verse en el panel del proveedor.`)
                  } else {
                    setOpenaiCheck(`Error: ${d.error ?? d.details ?? 'sin detalles'}. ${d.hint ?? ''}`)
                  }
                } catch (e) {
                  setOpenaiCheck(`No se pudo conectar: ${e instanceof Error ? e.message : String(e)}. ¿Servidor en marcha (npm run dev)?`)
                }
              }}
            >
              Comprobar IA (servidor)
            </Button>
            {openaiCheck && (
              <span className="text-xs text-muted-foreground">{openaiCheck}</span>
            )}
          </div>
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
