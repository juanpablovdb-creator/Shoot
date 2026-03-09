'use client'

import { Badge } from '@/components/ui/badge'
import { BREAKDOWN_CATEGORIES } from '@/lib/constants/categories'
import type { BreakdownCategoryKey } from '@/types'
import { cn } from '@/lib/utils'

interface CategoryBadgeProps {
  category: BreakdownCategoryKey
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = BREAKDOWN_CATEGORIES[category]
  if (!config) return null
  return (
    <Badge
      className={cn('text-xs font-normal', className)}
      style={{
        backgroundColor: `${config.color}22`,
        color: config.color,
        borderColor: config.color,
      }}
      variant="outline"
    >
      {config.label}
    </Badge>
  )
}
