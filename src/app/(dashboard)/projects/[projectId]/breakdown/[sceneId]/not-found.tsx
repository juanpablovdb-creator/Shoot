import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'

export default function SceneNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Escena no encontrada
      </h1>
      <p className="text-sm text-muted-foreground">
        La escena no existe o no tienes permiso para verla.
      </p>
      <Link
        href=".."
        className={buttonVariants({ variant: 'outline' })}
      >
        Volver al desglose
      </Link>
    </div>
  )
}
