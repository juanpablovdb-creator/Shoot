/**
 * Las páginas se miden en octavos (1/8 de página).
 */

export function eighthsToPages(eighths: number): number {
  return eighths / 8
}

export function pagesToEighths(pages: number): number {
  return Math.round(pages * 8)
}

export function formatEighths(eighths: number): string {
  const fullPages = Math.floor(eighths / 8)
  const remainingEighths = eighths % 8

  if (remainingEighths === 0) return `${fullPages}`
  if (fullPages === 0) return `${remainingEighths}/8`
  return `${fullPages} ${remainingEighths}/8`
}
