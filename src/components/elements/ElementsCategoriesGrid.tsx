'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDownAZ, ArrowUpAZ, ArrowDownWideNarrow, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type ElementsCategoryCard = {
  key: string
  label: string
  href: string
  items: string[]
}

type SortMode = 'custom' | 'az' | 'za' | 'count'

function SortableCategoryCard({
  item,
  dragEnabled,
}: {
  item: ElementsCategoryCard
  dragEnabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
    disabled: !dragEnabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        dragEnabled && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-70'
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{item.label}</h3>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {item.items.length} ítem{item.items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <Link
        href={item.href}
        className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
        onClick={(e) => {
          // Evita navegación accidental mientras se está reordenando.
          if (dragEnabled) e.stopPropagation()
        }}
      >
        Ver detalle →
      </Link>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-muted-foreground">
        {item.items.length === 0 ? (
          <li className="italic text-xs">Sin elementos en esta categoría.</li>
        ) : (
          item.items.map((name, i) => (
            <li key={`${item.key}-${i}-${name.slice(0, 40)}`}>{name}</li>
          ))
        )}
      </ul>
    </div>
  )
}

export function ElementsCategoriesGrid({
  items,
  storageKey,
}: {
  items: ElementsCategoryCard[]
  /** key para persistir orden manual (p. ej. por projectId) */
  storageKey: string
}) {
  const [sortMode, setSortMode] = useState<SortMode>('custom')
  const [manualOrder, setManualOrder] = useState<string[]>([])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  // Cargar orden manual persistido (si existe)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(storageKey)
      const parsed = raw ? (JSON.parse(raw) as unknown) : null
      if (Array.isArray(parsed)) {
        setManualOrder(parsed.filter((x) => typeof x === 'string') as string[])
      }
    } catch {
      // noop
    }
  }, [storageKey])

  // Mantener manualOrder alineado con items actuales (agrega nuevos al final, quita faltantes)
  useEffect(() => {
    setManualOrder((prev) => {
      const keys = items.map((i) => i.key)
      const next = prev.filter((k) => keys.includes(k))
      for (const k of keys) if (!next.includes(k)) next.push(k)
      return next
    })
  }, [items])

  const sorted = useMemo(() => {
    const list = [...items]
    if (sortMode === 'custom') {
      const byKey = new Map(list.map((i) => [i.key, i]))
      return manualOrder.map((k) => byKey.get(k)).filter(Boolean) as ElementsCategoryCard[]
    }
    if (sortMode === 'az') return list.sort((a, b) => a.label.localeCompare(b.label, 'es'))
    if (sortMode === 'za') return list.sort((a, b) => b.label.localeCompare(a.label, 'es'))
    return list.sort((a, b) => (b.items?.length ?? 0) - (a.items?.length ?? 0))
  }, [items, sortMode, manualOrder])

  const dragEnabled = sortMode === 'custom'

  const persistManualOrder = (next: string[]) => {
    setManualOrder(next)
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      // noop
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
          >
            <SlidersHorizontal className="size-4" />
            Ordenar
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[220px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Orden</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortMode}
                onValueChange={(v) => setSortMode(v as SortMode)}
              >
                <DropdownMenuRadioItem value="custom">
                  Como quieras (manual)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="az">
                  <ArrowDownAZ className="size-4" />
                  A-Z
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="za">
                  <ArrowUpAZ className="size-4" />
                  Z-A
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="count">
                  <ArrowDownWideNarrow className="size-4" />
                  Mayor cantidad de ítems
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!dragEnabled) return
          if (!over) return
          if (active.id === over.id) return
          const oldIndex = manualOrder.indexOf(String(active.id))
          const newIndex = manualOrder.indexOf(String(over.id))
          if (oldIndex < 0 || newIndex < 0) return
          persistManualOrder(arrayMove(manualOrder, oldIndex, newIndex))
        }}
      >
        <SortableContext items={sorted.map((i) => i.key)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((item) => (
              <SortableCategoryCard key={item.key} item={item} dragEnabled={dragEnabled} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

