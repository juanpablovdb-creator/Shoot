'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImportScriptDialog } from './ImportScriptDialog'
import { FileText, Upload, Loader2, FileUp } from 'lucide-react'
import { deleteAllProjectScenes, type ParsedScene } from '@/lib/breakdown-import'

const BUCKET = 'project-scripts'

export function ScriptSection({
  projectId,
  initialScriptContent,
  initialScriptFilePath,
  initialScriptFileName,
  initialScenesCount = 0,
}: {
  projectId: string
  initialScriptContent: string
  initialScriptFilePath: string | null
  initialScriptFileName: string | null
  initialScenesCount?: number
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingPageCount, setLoadingPageCount] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)
  const [rehacerLoading, setRehacerLoading] = useState(false)
  const [useGpt4, setUseGpt4] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasPdf = Boolean(initialScriptFilePath)

  const refreshSignedUrl = useCallback(async () => {
    if (!initialScriptFilePath) return
    const supabase = createClient()
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(initialScriptFilePath, 3600)
    if (data?.signedUrl) setSignedUrl(data.signedUrl)
  }, [initialScriptFilePath])

  useEffect(() => {
    if (!hasPdf) return
    refreshSignedUrl()
  }, [hasPdf, refreshSignedUrl])

  // Conteo de páginas desde el servidor (sin pdfjs-dist en cliente)
  useEffect(() => {
    if (!hasPdf || !projectId) return
    let cancelled = false
    setLoadingPageCount(true)
    fetch(`/api/projects/${projectId}/script-info`)
      .then((res) => res.json())
      .then((data: { pageCount?: number }) => {
        if (!cancelled && typeof data.pageCount === 'number') setPageCount(data.pageCount)
      })
      .finally(() => {
        if (!cancelled) setLoadingPageCount(false)
      })
    return () => {
      cancelled = true
    }
  }, [hasPdf, projectId])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || file.type !== 'application/pdf') {
      setUploadError('Selecciona un archivo PDF.')
      return
    }
    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const res = await fetch(`/api/projects/${projectId}/upload-script`, {
        method: 'POST',
        body: formData,
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setUploadError(data.error ?? 'Error al subir el PDF')
        return
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleImportFromPdf() {
    let text = initialScriptContent?.trim() ?? ''
    if (!text && !hasPdf) {
      setUploadError('No hay PDF subido ni texto. Sube el guion o usa "Importar guion" para pegar texto.')
      return
    }
    setExtracting(true)
    setUploadError(null)
    setImportSuccess(null)
    try {
      if (!text && hasPdf) {
        const res = await fetch(`/api/projects/${projectId}/extract-script`)
        const data = (await res.json()) as {
          text?: string
          error?: string
          details?: string
        }
        if (!res.ok) {
          const msg = data.error ?? 'No se pudo extraer texto del PDF.'
          const detail = data.details ? ` (${data.details})` : ''
          setUploadError(msg + detail)
          return
        }
        text = data.text?.trim() ?? ''
        if (!text) {
          setUploadError('El PDF no contiene texto extraíble.')
          return
        }
      }
      const parseRes = await fetch('/api/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, projectId, useGpt4 }),
      })
      const parseData = (await parseRes.json()) as {
        scenes?: ParsedScene[]
        error?: string
        details?: string
        hint?: string
      }
      if (!parseRes.ok) {
        const msg = parseData.error ?? 'Error al parsear el guion'
        const parts = [msg, parseData.details, parseData.hint].filter(Boolean)
        setUploadError(parts.join(' · '))
        return
      }
      const scenes = parseData.scenes ?? []
      if (scenes.length === 0) {
        setUploadError('No se detectaron escenas en el texto.')
        return
      }
      const importRes = await fetch(`/api/projects/${projectId}/breakdown/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, saveScriptContent: text }),
      })
      const importData = (await importRes.json()) as {
        inserted?: number
        skipped?: number
        error?: string
        details?: string
      }
      if (!importRes.ok) {
        const parts = [
          importData.error ?? 'Error al importar desglose',
          importData.details,
        ].filter(Boolean)
        setUploadError(parts.join(' · '))
        return
      }
      const inserted = importData.inserted ?? 0
      const skipped = importData.skipped ?? 0
      router.refresh()
      if (inserted > 0) {
        setImportSuccess(
          `Se importaron ${inserted} escena${inserted !== 1 ? 's' : ''}.`
        )
        setTimeout(() => setImportSuccess(null), 4000)
      } else if (skipped > 0) {
        setImportSuccess(
          `${skipped} escena${skipped !== 1 ? 's' : ''} ya existían en el desglose. No se duplicaron.`
        )
        setTimeout(() => setImportSuccess(null), 4000)
      } else {
        setUploadError('No se pudieron crear escenas en la base de datos.')
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Error al importar escenas.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleRehacerDesglose() {
    let text = initialScriptContent?.trim() ?? ''
    setRehacerLoading(true)
    setUploadError(null)
    setImportSuccess(null)
    try {
      if (hasPdf && !text) {
        const res = await fetch(`/api/projects/${projectId}/extract-script`)
        const data = (await res.json()) as { text?: string; error?: string; details?: string }
        if (!res.ok) {
          setUploadError(data.error ?? 'No se pudo extraer el PDF.' + (data.details ? ` (${data.details})` : ''))
          return
        }
        text = data.text?.trim() ?? ''
      }
      if (!text) {
        setUploadError('No hay texto del guion. Sube el PDF y vuelve a intentar.')
        return
      }
      const parseRes = await fetch('/api/parse-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, projectId, useGpt4 }),
      })
      const parseData = (await parseRes.json()) as { scenes?: ParsedScene[]; error?: string; details?: string; hint?: string }
      if (!parseRes.ok) {
        const msg = parseData.error ?? 'Error al analizar el guion'
        const parts = [msg, parseData.details, parseData.hint].filter(Boolean)
        setUploadError(parts.join(' · '))
        return
      }
      const scenes = parseData.scenes ?? []
      if (scenes.length === 0) {
        setUploadError('No se detectaron escenas en el texto.')
        return
      }
      await deleteAllProjectScenes(projectId)
      const importRes = await fetch(`/api/projects/${projectId}/breakdown/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenes, saveScriptContent: text }),
      })
      const importData = (await importRes.json()) as {
        inserted?: number
        error?: string
        details?: string
      }
      if (!importRes.ok) {
        const parts = [
          importData.error ?? 'Error al importar desglose',
          importData.details,
        ].filter(Boolean)
        setUploadError(parts.join(' · '))
        return
      }
      const inserted = importData.inserted ?? 0
      router.refresh()
      setImportSuccess(
        `Desglose rehecho: ${inserted} escena${inserted !== 1 ? 's' : ''} con cast, SFX, VFX y stunts.`
      )
      setTimeout(() => setImportSuccess(null), 5000)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Error al rehacer el desglose.')
    } finally {
      setRehacerLoading(false)
    }
  }

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" />
              Guion (PDF)
            </CardTitle>
            <CardDescription>
              Sube el PDF del guion para contar páginas y poder importar las escenas al desglose.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPdf ? (
          <div className="space-y-2">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 py-10 transition-colors hover:bg-muted/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <Loader2 className="size-10 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-10 text-muted-foreground" />
              )}
              <span className="mt-2 text-sm font-medium text-foreground">
                {uploading ? 'Subiendo PDF...' : 'Subir PDF del guion'}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Solo archivos PDF. Podrás ver páginas e importar escenas.
              </span>
            </label>
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <FileUp className="size-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {initialScriptFileName ?? 'script.pdf'}
                </span>
                {loadingPageCount ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : pageCount != null ? (
                  <span className="text-xs text-muted-foreground">
                    {pageCount} página{pageCount !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGpt4}
                    onChange={(e) => setUseGpt4(e.target.checked)}
                    disabled={extracting || rehacerLoading}
                    className="rounded border-input"
                  />
                  <span className="text-xs text-muted-foreground">Usar GPT-4</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Cambiar PDF
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleImportFromPdf}
                  disabled={loadingPageCount || extracting || rehacerLoading}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Importando escenas...
                    </>
                  ) : (
                    'Importar escenas desde este guion'
                  )}
                </Button>
                {initialScenesCount > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRehacerDesglose}
                    disabled={loadingPageCount || extracting || rehacerLoading}
                  >
                    {rehacerLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Rehaciendo desglose...
                      </>
                    ) : (
                      'Rehacer desglose con IA'
                    )}
                  </Button>
                )}
              </div>
            </div>
            {importSuccess && (
              <p className="text-sm text-green-600">{importSuccess}</p>
            )}
            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}
            {signedUrl && (
              <div className="rounded-lg border border-border bg-muted/10 overflow-hidden">
                <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                  Vista previa
                </p>
                <iframe
                  src={signedUrl}
                  title="Vista previa del guion"
                  className="h-[420px] w-full"
                />
              </div>
            )}
          </div>
        )}

        <ImportScriptDialog
          projectId={projectId}
          initialText={extractedText || initialScriptContent}
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          triggerClassName="inline-flex"
        />
      </CardContent>
    </Card>
  )
}
