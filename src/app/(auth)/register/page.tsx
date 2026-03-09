'use client'

import { useState } from 'react'
import Link from 'next/link'
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

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }
    setMessage({
      type: 'success',
      text: 'Revisa tu correo para confirmar la cuenta.',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Plataforma de desglose y plan de rodaje</CardDescription>
      </CardHeader>
      <CardContent>
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
              minLength={6}
            />
          </div>
          {message && (
            <p
              className={
                message.type === 'error'
                  ? 'text-sm text-destructive'
                  : 'text-sm text-green-600'
              }
            >
              {message.text}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-primary underline">
            Iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
