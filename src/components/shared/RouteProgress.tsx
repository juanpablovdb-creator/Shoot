'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

type State = { active: boolean; key: number; progress: number; finishing: boolean }

/**
 * Barra de progreso mínima para navegación (App Router).
 * - Se activa al hacer click en links internos.
 * - Se apaga al cambiar pathname/searchParams.
 * - Tiene un mínimo de tiempo visible para que se note.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [st, setSt] = useState<State>({
    active: false,
    key: 0,
    progress: 0,
    finishing: false,
  })
  const lastStartAt = useRef<number>(0)
  const stopTimer = useRef<number | null>(null)
  const slowTimer = useRef<number | null>(null)

  const start = () => {
    if (stopTimer.current != null) {
      window.clearTimeout(stopTimer.current)
      stopTimer.current = null
    }
    if (slowTimer.current != null) {
      window.clearTimeout(slowTimer.current)
      slowTimer.current = null
    }
    lastStartAt.current = Date.now()
    // Arranca visible y avanza lento hasta ~85% (sensación de "está cargando")
    setSt((p) => ({
      active: true,
      key: p.key + 1,
      progress: 12,
      finishing: false,
    }))
    // disparar el avance lento después de que el DOM pinte
    slowTimer.current = window.setTimeout(() => {
      setSt((p) => (p.active ? { ...p, progress: 86 } : p))
      slowTimer.current = null
    }, 80)
  }

  const stop = () => {
    const elapsed = Date.now() - lastStartAt.current
    const minVisible = 450
    const wait = Math.max(0, minVisible - elapsed)
    if (stopTimer.current != null) window.clearTimeout(stopTimer.current)
    stopTimer.current = window.setTimeout(() => {
      // "Finish" visible: completa a 100% y luego desaparece
      setSt((p) => ({ ...p, finishing: true, progress: 100 }))
      window.setTimeout(() => {
        setSt((p) => ({ ...p, active: false, finishing: false, progress: 0 }))
      }, 220)
      stopTimer.current = null
    }, wait)
  }

  useEffect(() => {
    // Parar al completar navegación (path o query cambió)
    stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()])

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (!href || href.startsWith('#')) return
      if (a.getAttribute('target') === '_blank') return
      // Solo navegación interna
      if (/^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:')) return
      start()
    }

    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!st.active) return null

  return (
    <div className="pointer-events-none fixed right-4 top-3 z-[60] w-[220px]">
      <div className="h-1 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10">
        <div
          key={st.key}
          className="h-full origin-left rounded-full bg-primary/70"
          style={{
            width: `${st.progress}%`,
            transition: st.finishing
              ? 'width 180ms ease-out, opacity 180ms ease-out'
              : 'width 3400ms ease-out',
            opacity: st.finishing ? 0.85 : 0.7,
          }}
        />
      </div>
    </div>
  )
}

