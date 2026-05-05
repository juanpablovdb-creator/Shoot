import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 break-words text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions != null ? (
        <div className="shrink-0 sm:mt-0">{actions}</div>
      ) : null}
    </div>
  )
}
