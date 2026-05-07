'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>Plataforma de desglose y plan de rodaje</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          El acceso es solo con Google por ahora.
        </p>
        <Link href="/login">
          <Button className="mt-4 w-full">Continuar con Google</Button>
        </Link>
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
