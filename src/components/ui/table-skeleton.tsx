import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TableSkeletonProps {
  columns?: number
  rows?: number
}

export function TableSkeleton({ columns = 5, rows = 5 }: TableSkeletonProps) {
  return (
    <Card className="rounded-none shadow-none py-0 gap-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <TableCell key={colIdx} className="px-4 py-4">
                  <Skeleton
                    className={`h-4 ${colIdx === 0 ? 'w-32' : 'w-20'}`}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
