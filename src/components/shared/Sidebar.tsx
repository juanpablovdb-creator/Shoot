'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogIn,
  LogOut,
  Film,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const nav = [
  { href: '/', label: 'Inicio', icon: LayoutDashboard },
  { href: '/projects', label: 'Proyectos', icon: FolderKanban },
]

const bottomNav = { href: '/settings', label: 'Configuración', icon: Settings }

export function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ email?: string } | null>(null)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null))
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) =>
        setUser(session?.user ?? null)
      )
      return () => subscription.unsubscribe()
    } catch {
      setUser(null)
    }
  }, [])

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Film className="size-4" />
        </div>
        <span className="font-semibold tracking-tight text-sidebar-foreground">
          Shoot
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="size-[1.125rem] shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        {(() => {
          const Icon = bottomNav.icon
          const isActive =
            pathname === bottomNav.href ||
            (bottomNav.href !== '/' && pathname.startsWith(bottomNav.href))
          return (
            <Link
              href={bottomNav.href}
              className={cn(
                'mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              )}
            >
              <Icon className="size-[1.125rem] shrink-0" />
              {bottomNav.label}
            </Link>
          )
        })()}
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-sidebar-foreground/70">
            Tema
          </span>
          <ThemeToggle />
        </div>
        {user != null && (
          <div className="flex flex-col gap-1.5">
            <span className="truncate rounded-lg bg-sidebar-accent/50 px-3 py-2 text-xs text-sidebar-foreground/90">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="w-full justify-start text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={async () => {
                const supabase = createClient()
                await supabase.auth.signOut()
                window.location.href = '/'
              }}
            >
              <LogOut className="size-3.5" />
              Salir
            </Button>
          </div>
        )}
        {user == null && (
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'w-full justify-center gap-2 border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent'
            )}
          >
            <LogIn className="size-4" aria-hidden />
            Iniciar sesión
          </Link>
        )}
      </div>
    </aside>
  )
}
