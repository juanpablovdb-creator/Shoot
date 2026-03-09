'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Tema"
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground',
          className
        )}
      >
        <Sun className="size-4" />
      </button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label={isDark ? 'Usar tema claro' : 'Usar tema oscuro'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
        className
      )}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
