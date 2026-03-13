'use client'

import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type UnifiedLocationItem = {
  id: string
  name: string
  type: 'location' | 'set'
  address?: string | null
  city?: string | null
  locationName?: string | null
  firstSceneSort?: number | null
  createdAt?: string | null
}

type SortOption = 'az' | 'za' | 'chronological'

export function LocationsSection({
  items = [],
}: {
  items: UnifiedLocationItem[]
}) {
  const [sortOrder, setSortOrder] = useState<SortOption>('az')

  const sortedItems = useMemo(() => {
    const list = [...items]
    if (sortOrder === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    } else if (sortOrder === 'za') {
      list.sort((a, b) => b.name.localeCompare(a.name, 'es'))
    } else {
      list.sort((a, b) => {
        const aSort = a.firstSceneSort ?? Infinity
        const bSort = b.firstSceneSort ?? Infinity
        if (aSort !== bSort) return aSort - bSort
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : Infinity
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : Infinity
        return aDate - bDate
      })
    }
    return list
  }, [items, sortOrder])

  const hasAny = sortedItems.length > 0

  return (
    <div className="mt-6 space-y-4">
      {hasAny && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar:</span>
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as SortOption)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">A–Z</SelectItem>
              <SelectItem value="za">Z–A</SelectItem>
              <SelectItem value="chronological">Cronológico (guion)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {!hasAny ? (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay locaciones en este proyecto. Las locaciones se crean al importar
          el guion o al asignar set y locación en las escenas del Desglose.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Dirección
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Ciudad
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Locación
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr
                  key={`${item.type}-${item.id}`}
                  className="border-b border-border/80 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.type === 'location' ? 'Locación' : 'Set'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.city ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.locationName ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
