import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Configuración" description="Preferencias de la cuenta" />
      <Card className="mt-6 max-w-xl rounded-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
          <CardDescription>
            Gestiona tu sesión y preferencias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aquí podrás configurar notificaciones, idioma y exportaciones en futuras versiones.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
