import { Suspense } from 'react'
import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
