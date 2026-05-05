/**
 * Parte el guion en bloques por cabecera de escena (INT./EXT.) para poder enviar
 * trozos completos al modelo sin cortar a mitad de escena ni perder escenas largas.
 */
const SCENE_HEADING_LINE = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)\s+/i

export function splitScriptIntoSceneBlocks(fullText: string): string[] {
  const text = fullText.replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const starts: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (SCENE_HEADING_LINE.test(lines[i].trim())) starts.push(i)
  }
  if (starts.length === 0) {
    const t = text.trim()
    return t ? [t] : []
  }

  const blocks: string[] = []
  if (starts[0]! > 0) {
    blocks.push(lines.slice(0, starts[0]!).join('\n'))
  }
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1]! : lines.length
    blocks.push(lines.slice(starts[i]!, end).join('\n'))
  }
  return blocks.map((b) => b.trim()).filter((b) => b.length > 0)
}

/** Agrupa bloques consecutivos sin superar ~maxPayloadChars (texto usuario por llamada). */
export function batchBlocksForLlm(blocks: string[], maxPayloadChars: number): string[][] {
  const batches: string[][] = []
  let cur: string[] = []
  let size = 0
  for (const b of blocks) {
    const len = b.length + 2
    if (size + len > maxPayloadChars && cur.length > 0) {
      batches.push(cur)
      cur = []
      size = 0
    }
    cur.push(b)
    size += len
  }
  if (cur.length > 0) batches.push(cur)
  return batches
}
