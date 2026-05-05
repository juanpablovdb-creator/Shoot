'use client'

import { useState, useMemo } from 'react'
import { StripRow, type StripRowData } from './StripRow'
import { ArrowUpDown, ArrowDownAZ, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StripSortBy = 'scene' | 'set'

interface StripboardViewProps {
  strips: StripRowData[]
  projectId: string
  /** Páginas totales del guion; la suma de octavos debe ser exactamente scriptTotalPages × 8. */
  scriptTotalPages?: number
}

export function StripboardView({ strips, projectId, scriptTotalPages }: StripboardViewProps) {
  const [sortBy, setSortBy] = useState<StripSortBy>('scene')
  const [asc, setAsc] = useState(true)

  const sortedStrips = useMemo(() => {
    const list = [...strips]
    if (sortBy === 'scene') {
      list.sort((a, b) => {
        const diff = a.scene_number_sort - b.scene_number_sort
        return asc ? diff : -diff
      })
    } else {
      list.sort((a, b) => {
        const nameA = (a.set_name ?? a.setLocationName ?? '').toLowerCase()
        const nameB = (b.set_name ?? b.setLocationName ?? '').toLowerCase()
        const cmp = nameA.localeCompare(nameB) || a.scene_number_sort - b.scene_number_sort
        return asc ? cmp : -cmp
      })
    }
    return list
  }, [strips, sortBy, asc])

  const totalEighths = strips.reduce((s, t) => s + t.page_eighths, 0)
  const totalPagesFromEighths = totalEighths / 8
  const totalPages = totalPagesFromEighths.toFixed(1)
  const matchesScript =
    scriptTotalPages != null && Math.abs(totalPagesFromEighths - scriptTotalPages) < 0.01

  return (
    <div className="space-y-4">
      {/* Barra: ordenar y totales */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Ordenar por:
          </span>
          <button
            type="button"
            onClick={() => {
              setSortBy('scene')
              setAsc(true)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              sortBy === 'scene'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <ArrowDownAZ className="size-4" />
            Escena
          </button>
          <button
            type="button"
            onClick={() => {
              setSortBy('set')
              setAsc(true)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              sortBy === 'set'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            <LayoutGrid className="size-4" />
            Set/Locación
          </button>
          <button
            type="button"
            onClick={() => setAsc((a) => !a)}
            className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            title={asc ? 'Ascendente (clic para descendente)' : 'Descendente (clic para ascendente)'}
          >
            <ArrowUpDown className="size-4" />
            {asc ? 'Asc' : 'Desc'}
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          {strips.length} escenas · {totalPages} páginas
          {scriptTotalPages != null && (
            <span className="ml-1">
              (guion: {scriptTotalPages} hoja{scriptTotalPages !== 1 ? 's' : ''}
              {matchesScript ? ' ✓' : ''})
            </span>
          )}
        </div>
      </div>

      {/* Tabla de franjas — ancho completo; líneas de arriba a abajo */}
      <div className="w-full overflow-auto rounded-xl border border-gray-800 bg-card">
        <div role="table" className="w-full min-w-[640px]">
          <div
            className="flex min-h-[44px] items-center border-b-2 border-gray-800 bg-muted text-xs font-semibold uppercase tracking-wider text-foreground"
            role="row"
          >
            <div className="w-2 shrink-0 border-r border-gray-800" />
            <div className="w-[52px] shrink-0 border-r border-gray-800 px-1.5 py-2 text-center">
              Escena
            </div>
            <div className="min-w-[200px] flex-1 border-r border-gray-800 px-2 py-2" style={{ minWidth: 0 }}>
              INT/EXT · Título · Descripción
            </div>
            <div className="w-[100px] shrink-0 border-r border-gray-800 px-2 py-2">
              Locación esp.
            </div>
            <div className="w-[100px] shrink-0 border-r border-gray-800 px-2 py-2 text-center">
              Cast
            </div>
            <div className="w-[72px] shrink-0 border-r border-gray-800 px-2 py-2 text-center">
              Stunts
            </div>
            <div className="w-[52px] shrink-0 border-r border-gray-800 px-2 py-2 text-right">
              Págs
            </div>
          </div>
          {sortedStrips.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No hay escenas en el desglose. Importa un guion desde el Desglose.
            </div>
          ) : (
            sortedStrips.map((strip) => (
              <StripRow key={strip.id} projectId={projectId} {...strip} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
