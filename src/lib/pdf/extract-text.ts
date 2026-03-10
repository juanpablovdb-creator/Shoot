/**
 * Extrae texto de un PDF (buffer) en el servidor.
 * Usa el paquete pdf-parse (PDFParse + getText).
 */
import { PDFParse } from 'pdf-parse'

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Buffer del PDF vacío')
  }
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    const text = (result?.text ?? '').trim()
    return text
  } finally {
    await parser.destroy()
  }
}
