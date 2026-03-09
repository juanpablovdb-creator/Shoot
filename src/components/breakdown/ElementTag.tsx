'use client'

import { BREAKDOWN_CATEGORIES } from '@/lib/constants/categories'
import type { BreakdownCategoryKey } from '@/types'
import { cn } from '@/lib/utils'

interface ElementTagProps {
  name: string
  category: BreakdownCategoryKey
  className?: string
}

export function ElementTag({ name, category, className }: ElementTagProps) {
  const config = BREAKDOWN_CATEGORIES[category]
  if (!config) return <span className={cn('text-xs', className)}>{name}</span>
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs',
        className
      )}
      style={{
        backgroundColor: `${config.color}33`,
        color: config.color,
      }}
    >
      {name}
    </span>
  )
}
