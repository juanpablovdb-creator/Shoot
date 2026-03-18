/**
 * Infiere posibles nombres de personaje desde una sinopsis (español).
 * Usado cuando el parse no devuelve cast en una escena, para rellenar scene_elements/scene_cast.
 * Excluye términos de guion (Montaje, Vista), locaciones y palabras que no son personajes.
 */

const STOPWORDS = new Set(
  'el la los las un una unos unas al a del de en por con sin sobre bajo entre durante según contra desde hasta para hacia tras qué quien cuál cuales donde cuando como porque aunque sino pero y o ni si no sí ya bien muy más menos así aquí allí entonces luego después antes mientras'.split(/\s+/)
)

/** Términos que no son nombres de personaje: guion, técnica, locaciones frecuentes. */
const NOT_CHARACTERS = new Set([
  'montaje', 'vista', 'vistas', 'flashback', 'flashbacks', 'intercut', 'intertítulo',
  'fusagasugá', 'fusagasuga', 'fusagasug', 'colombia', 'bogotá', 'cartagena',
  'exterior', 'interior', 'noche', 'día', 'amanecer', 'atardecer',
  'plano', 'secuencia', 'escena', 'continúa', 'corte', 'negro',
])

function isLikelyCharacter(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (NOT_CHARACTERS.has(lower)) return false
  if (STOPWORDS.has(lower)) return false
  return true
}

export function inferCastFromSynopsis(synopsis: string): string[] {
  if (!synopsis?.trim()) return []
  const names: string[] = []
  const seen = new Set<string>()
  const re = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\b/g
  let m: RegExpExecArray | null
  while ((m = re.exec(synopsis)) !== null) {
    const raw = m[1].trim()
    const lower = raw.toLowerCase()
    const firstWord = raw.split(/\s+/)[0]?.toLowerCase() ?? ''
    if (STOPWORDS.has(firstWord) || STOPWORDS.has(lower) || seen.has(lower)) continue
    if (!isLikelyCharacter(raw)) continue
    if (raw.length < 2 || raw.length > 60) continue
    seen.add(lower)
    names.push(raw)
    if (names.length >= 6) break
  }
  return names
}
