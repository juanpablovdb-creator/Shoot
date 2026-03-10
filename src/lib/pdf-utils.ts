/**
 * Utilidades para PDF en el cliente (conteo de páginas, extracción de texto).
 * Usa pdfjs-dist; el worker se carga desde CDN para evitar problemas con bundling.
 */

import * as pdfjsLib from 'pdfjs-dist'

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

type PdfSource = string | File | ArrayBuffer

function getDocumentSource(source: PdfSource): string | ArrayBuffer | { url: string } | { data: ArrayBuffer } {
  if (typeof source === 'string') return { url: source }
  if (source instanceof ArrayBuffer) return { data: source }
  return { data: source as unknown as ArrayBuffer }
}

export async function getPdfPageCount(source: PdfSource): Promise<number> {
  const src = source instanceof File ? { data: await source.arrayBuffer() } : getDocumentSource(source)
  const doc = await pdfjsLib.getDocument(src).promise
  return doc.numPages
}

export async function extractTextFromPdf(source: PdfSource): Promise<string> {
  const src = source instanceof File ? { data: await source.arrayBuffer() } : getDocumentSource(source)
  const doc = await pdfjsLib.getDocument(src).promise
  const numPages = doc.numPages
  const parts: string[] = []
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(text)
  }
  return parts.join('\n\n')
}
