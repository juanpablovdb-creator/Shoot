'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const REDIRECT_URL_HELP =
  'Añade en Supabase (Authentication → URL Configuration → Redirect URLs): http://localhost:3000/auth/callback o http://localhost:3000/**'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const errorFromUrl = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(() =>
    errorFromUrl ? { type: 'error', text: errorFromUrl } : null
  )

  async function handleGoogle() {
    setLoading(true)
    setMessage(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
      }
      // On success: Supabase will redirect away.
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : String(e) })
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({ type: 'success', text: 'Sesión iniciada. Redirigiendo...' })
    window.location.href = next
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Plataforma de desglose y plan de rodaje</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continuar con Google
        </Button>
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {message && (
            <div className="space-y-1">
              <p
                className={
                  message.type === 'error'
                    ? 'text-sm text-destructive'
                    : 'text-sm text-green-600'
                }
              >
                {message.text}
              </p>
              {message.type === 'error' && (
                <p className="text-xs text-muted-foreground">{REDIRECT_URL_HELP}</p>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-primary underline">
            Regístrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
