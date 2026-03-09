import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Cargando...', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-12',
        className
      )}
    >
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
