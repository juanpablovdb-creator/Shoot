/** Resumen de escenas con elementos stunts / SPFX / VFX en el desglose (no solo flags en BD). */
export function ProductionComplexityBanner({
  totalScenes,
  stuntScenes,
  sfxScenes,
  vfxScenes,
}: {
  totalScenes: number
  stuntScenes: number
  sfxScenes: number
  vfxScenes: number
}) {
  if (totalScenes === 0) return null
  if (stuntScenes === 0 && sfxScenes === 0 && vfxScenes === 0) return null

  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <p className="font-medium">Complejidad de rodaje</p>
      <p className="mt-0.5 text-xs text-amber-900/75 dark:text-amber-100/75">
        Conteo por escenas que tienen al menos un elemento en cada categoría (stunts, SPFX o VFX) en el
        desglose.
      </p>
      <ul className="mt-2 flex list-none flex-wrap gap-x-6 gap-y-1 text-amber-900/90 dark:text-amber-100/90">
        {stuntScenes > 0 && (
          <li>
            Stunts: <strong className="tabular-nums">{stuntScenes}</strong> escena
            {stuntScenes !== 1 ? 's' : ''}
          </li>
        )}
        {sfxScenes > 0 && (
          <li>
            SPFX: <strong className="tabular-nums">{sfxScenes}</strong> escena{sfxScenes !== 1 ? 's' : ''}
          </li>
        )}
        {vfxScenes > 0 && (
          <li>
            VFX: <strong className="tabular-nums">{vfxScenes}</strong> escena{vfxScenes !== 1 ? 's' : ''}
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-100/80">
        Si un número te sorprende, abre el desglose de la escena y revisa la lista de elementos; los
        checks del stripboard usan la misma lógica cuando hay elementos vinculados.
      </p>
    </div>
  )
}
