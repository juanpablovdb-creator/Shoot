/**
 * Las páginas se miden en octavos (1/8 de página).
 * 7 → "7/8", 8 → "1", 10 → "1 2/8", 12 → "1 4/8"
 */

export function eighthsToPages(eighths: number): number {
  return eighths / 8
}

export function pagesToEighths(pages: number): number {
  return Math.round(pages * 8)
}

export function formatEighths(eighths: number): string {
  const e = Math.max(0, Math.round(Number(eighths)) || 0)
  const fullPages = Math.floor(e / 8)
  const remainingEighths = e % 8

  if (remainingEighths === 0) return `${fullPages}`
  if (fullPages === 0) return `${remainingEighths}/8`
  return `${fullPages} ${remainingEighths}/8`
}
