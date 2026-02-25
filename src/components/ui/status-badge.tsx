import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Clock,
  Download,
  FileText,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

type StatusType =
  | 'PAID'
  | 'PENDING'
  | 'PROCESSED'
  | 'CANCELLED'
  | 'FAILED'
  | 'DRAFT'
  | 'FILED'
  | 'WAITING_FOR_FILING'
  | 'ACTIVE'
  | 'TERMINATED'
  | 'INACTIVE'

const statusConfig: Record<
  StatusType,
  {
    variant: 'success' | 'warning' | 'info' | 'destructive' | 'secondary' | 'default' | 'highlight'
    icon: typeof Clock
    label?: string
  }
> = {
  PAID: { variant: 'success', icon: CheckCircle },
  PENDING: { variant: 'warning', icon: Clock },
  PROCESSED: { variant: 'info', icon: Download },
  CANCELLED: { variant: 'destructive', icon: XCircle },
  FAILED: { variant: 'destructive', icon: XCircle },
  DRAFT: { variant: 'secondary', icon: AlertTriangle },
  FILED: { variant: 'default', icon: CheckCircle },
  WAITING_FOR_FILING: { variant: 'info', icon: FileText, label: 'WAITING FOR FILING' },
  ACTIVE: { variant: 'success', icon: CheckCircle },
  TERMINATED: { variant: 'destructive', icon: XCircle },
  INACTIVE: { variant: 'secondary', icon: Clock },
}

interface StatusBadgeProps {
  status: string
  showIcon?: boolean
  className?: string
}

export function StatusBadge({ status, showIcon = true, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    variant: 'secondary' as const,
    icon: Clock,
  }
  const Icon = config.icon
  const label = config.label || status.replace(/_/g, ' ')

  return (
    <Badge variant={config.variant} className={className}>
      {showIcon && <Icon className="w-3 h-3" />}
      {label}
    </Badge>
  )
}
