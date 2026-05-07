'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function ShootLogo() {
  return (
    <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <span className="text-lg font-semibold">S</span>
    </div>
  )
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M43.611 20.083H42V20H24v8h11.303C33.656 32.659 29.229 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.996 6.053 29.749 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="currentColor"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.996 6.053 29.749 4 24 4c-7.682 0-14.354 4.327-17.694 10.691z"
      />
      <path
        fill="currentColor"
        d="M24 44c5.111 0 9.269-1.979 12.47-5.197l-5.764-4.878C28.74 35.33 26.463 36 24 36c-5.208 0-9.622-3.317-11.283-7.946l-6.52 5.024C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="currentColor"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.224-2.33 4.12-4.597 5.225l.002-.001 5.764 4.878C36.146 38.37 44 33 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  )
}

export default function LoginClient() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const errorFromUrl = searchParams.get('error')

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

  return (
    <Card className="py-8">
      <CardHeader className="pb-6">
        <ShootLogo />
        <CardTitle className="mt-2 text-center text-2xl">Iniciar sesión</CardTitle>
        <CardDescription className="mt-1 text-center text-sm">
          Desglosa tu guion, organiza elementos y arma tu plan de rodaje.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          size="lg"
          className="w-full gap-2"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleLogo className="size-4 text-foreground" />
          Continuar con Google
        </Button>
        {message && (
          <div className="mt-4 space-y-1">
            <p
              className={
                message.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'
              }
            >
              {message.text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

