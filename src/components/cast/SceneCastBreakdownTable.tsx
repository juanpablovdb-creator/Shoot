'use client'

/**
 * Tabla de depuración: escena por escena, qué personajes (cast) reconoce el desglose.
 * Así se ve si scene_elements tiene cast en cada escena o no.
 */
export function SceneCastBreakdownTable({
  rows,
}: {
  rows: { scene_number: string; cast_names: string[] }[]
}) {
  if (!rows.length) return null

  return (
    <div className="mt-8 rounded-lg border border-border bg-muted/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Desglose por escena (qué personajes reconoce el desglose en cada escena)
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Si una escena sale con personajes vacíos, esa escena no tiene cast en scene_elements y no
        suma al conteo de apariciones.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-foreground">Escena</th>
              <th className="px-3 py-2 text-left font-medium text-foreground">Personajes (cast)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.scene_number} className="border-b border-border/60">
                <td className="px-3 py-2 font-mono text-muted-foreground">{row.scene_number}</td>
                <td className="px-3 py-2 text-foreground">
                  {row.cast_names.length > 0 ? (
                    row.cast_names.join(', ')
                  ) : (
                    <span className="italic text-muted-foreground">— ninguno —</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
