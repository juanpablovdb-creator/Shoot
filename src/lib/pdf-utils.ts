/**
 * Utilidades para PDF en el cliente (conteo de páginas, extracción de texto).
 * pdfjs-dist se carga con import dinámico para no ejecutarse en el servidor (DOMMatrix no existe en Node).
 * El worker se carga desde CDN.
 */

type PdfSource = string | File | ArrayBuffer

function getDocumentSource(source: PdfSource): string | ArrayBuffer | { url: string } | { data: ArrayBuffer } {
  if (typeof source === 'string') return { url: source }
  if (source instanceof ArrayBuffer) return { data: source }
  return { data: source as unknown as ArrayBuffer }
}

async function getPdfjsLib() {
  if (typeof window === 'undefined') {
    throw new Error('La extracción de PDF solo está disponible en el navegador.')
  }
  const pdfjsLib = await import('pdfjs-dist')
  // Worker desde /public para evitar que el bundler resuelva mal en server (Cannot find module pdf.worker.mjs)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  return pdfjsLib
}

export async function getPdfPageCount(source: PdfSource): Promise<number> {
  const pdfjsLib = await getPdfjsLib()
  const src = source instanceof File ? { data: await source.arrayBuffer() } : getDocumentSource(source)
  const doc = await pdfjsLib.getDocument(src).promise
  return doc.numPages
}

export async function extractTextFromPdf(source: PdfSource): Promise<string> {
  const pdfjsLib = await getPdfjsLib()
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
