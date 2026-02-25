import Link from 'next/link'
import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-devalok-50 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-devalok-300" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
