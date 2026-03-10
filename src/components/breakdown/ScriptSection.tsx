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
import { getPdfPageCount, extractTextFromPdf } from '@/lib/pdf-utils'

const BUCKET = 'project-scripts'
const SCRIPT_PATH = (projectId: string) => `${projectId}/script.pdf`

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasPdf = Boolean(initialScriptFilePath)

  // Al entrar al desglose con 0 escenas y guion en DB, abrir el diálogo para que solo tenga que dar "Importar"
  useEffect(() => {
    if (initialScenesCount > 0) return
    if (initialScriptContent?.trim()) {
      setExtractedText(initialScriptContent)
      setImportDialogOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [])

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

  useEffect(() => {
    if (!signedUrl || !hasPdf) return
    let cancelled = false
    setLoadingPageCount(true)
    getPdfPageCount(signedUrl)
      .then((n) => {
        if (!cancelled) setPageCount(n)
      })
      .finally(() => {
        if (!cancelled) setLoadingPageCount(false)
      })
    return () => {
      cancelled = true
    }
  }, [signedUrl, hasPdf])

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
    if (initialScriptContent?.trim()) {
      setExtractedText(initialScriptContent)
      setImportDialogOpen(true)
      return
    }
    if (!signedUrl) {
      setUploadError('No se pudo cargar el PDF. Recarga la página o sube el PDF de nuevo.')
      return
    }
    setExtracting(true)
    setUploadError(null)
    try {
      const text = await extractTextFromPdf(signedUrl)
      setExtractedText(text)
      setImportDialogOpen(true)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'No se pudo extraer texto del PDF.')
    } finally {
      setExtracting(false)
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
              <div className="flex gap-2">
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
                  disabled={loadingPageCount || extracting}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Extrayendo texto...
                    </>
                  ) : (
                    'Importar escenas desde este guion'
                  )}
                </Button>
              </div>
            </div>
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
