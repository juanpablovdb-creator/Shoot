import { ThemeToggle } from '@/components/shared/ThemeToggle'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle className="border-border bg-card shadow-sm" />
      </div>
      <div className="w-full max-w-lg">{children}</div>
    </div>
  )
}
