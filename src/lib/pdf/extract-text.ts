/**
 * Extracción de PDF en el servidor con unpdf (build serverless de PDF.js, worker inlined).
 * Evita pdf-parse que arrastra pdfjs-dist y provoca "Cannot find module pdf.worker.mjs" en Node.
 */
import { extractText, getDocumentProxy } from 'unpdf'

export async function getPdfPageCountFromBuffer(buffer: Buffer): Promise<number> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer del PDF vacío')
  }
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { totalPages } = await extractText(pdf, { mergePages: true })
  return Math.max(0, totalPages)
}

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer del PDF vacío')
  }
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: true })
  return (text ?? '').trim()
}
