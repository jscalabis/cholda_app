import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function KpiCard({ title, value, subtitle, trend, className }: Props) {
  return (
    <Card className={cn('', className)}>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && (
          <p
            className={cn(
              'mt-1 text-xs',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-500',
              (!trend || trend === 'neutral') && 'text-slate-500'
            )}
          >
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
