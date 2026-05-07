import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type PdfHeader = {
  title: string
  subtitle?: string
  metaRight?: string
}

export type PdfContext = {
  pdf: PDFDocument
  page: ReturnType<PDFDocument['addPage']>
  font: any
  fontBold: any
  x: number
  y: number
  width: number
}

const A4 = { width: 595.28, height: 841.89 }

export async function createPdfContext(): Promise<PdfContext> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([A4.width, A4.height])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const margin = 40
  return {
    pdf,
    page,
    font,
    fontBold,
    x: margin,
    y: A4.height - margin,
    width: A4.width - margin * 2,
  }
}

export function drawHeader(ctx: PdfContext, h: PdfHeader) {
  const { page, x, width } = ctx
  let y = ctx.y
  page.drawText(h.title, {
    x,
    y: y - 16,
    size: 16,
    font: ctx.fontBold,
    color: rgb(0.07, 0.07, 0.07),
  })
  if (h.metaRight) {
    const w = ctx.font.widthOfTextAtSize(h.metaRight, 9)
    page.drawText(h.metaRight, {
      x: x + width - w,
      y: y - 14,
      size: 9,
      font: ctx.font,
      color: rgb(0.35, 0.35, 0.35),
    })
  }
  y -= 34
  if (h.subtitle) {
    page.drawText(h.subtitle, {
      x,
      y,
      size: 10,
      font: ctx.font,
      color: rgb(0.35, 0.35, 0.35),
    })
    y -= 18
  } else {
    y -= 6
  }
  // divider
  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.92),
  })
  y -= 18
  ctx.y = y
}

export function drawTextBlock(ctx: PdfContext, text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) {
  const size = opts.size ?? 9
  const font = opts.bold ? ctx.fontBold : ctx.font
  const colorArr = opts.color ?? [0.07, 0.07, 0.07]
  const color = rgb(colorArr[0], colorArr[1], colorArr[2])
  // naive wrap by words
  const words = (text ?? '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    const wWidth = font.widthOfTextAtSize(next, size)
    if (wWidth > ctx.width && line) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)

  for (const ln of lines) {
    if (ctx.y < 60) {
      // new page
      ctx.page = ctx.pdf.addPage([A4.width, A4.height])
      ctx.y = A4.height - 40
    }
    ctx.page.drawText(ln, { x: ctx.x, y: ctx.y, size, font, color })
    ctx.y -= size + 4
  }
}

export async function pdfToBytes(pdf: PDFDocument): Promise<Uint8Array> {
  return await pdf.save()
}

export function safeFilename(name: string) {
  return (name ?? 'export')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60)
}

