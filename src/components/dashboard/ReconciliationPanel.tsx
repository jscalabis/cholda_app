import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatKwh, formatEur, fmtNum } from '@/lib/utils'
import type { MonthlyEnergySummary } from '@/lib/types'

interface Props {
  summary: MonthlyEnergySummary
}

export function ReconciliationPanel({ summary }: Props) {
  const { invoice, invoice_delta_kwh, grid_consumed_kwh } = summary

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Reconciliação com Fatura</CardTitle>
      </CardHeader>
      <CardContent>
        {!invoice ? (
          <p className="text-sm text-slate-500">Nenhuma fatura registada para este mês.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Consumo calculado (rede)</p>
                <p className="font-semibold">{formatKwh(grid_consumed_kwh)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Consumo na fatura</p>
                <p className="font-semibold">{formatKwh(invoice.kwh_consumed)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Custo total (fatura)</p>
                <p className="font-semibold">{formatEur(invoice.total_cost_eur)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Diferença</p>
                <div className="flex items-center gap-1">
                  <p className="font-semibold">
                    {invoice_delta_kwh !== null ? formatKwh(Math.abs(invoice_delta_kwh)) : '—'}
                  </p>
                  {invoice_delta_kwh !== null && (
                    <Badge
                      variant={
                        Math.abs(invoice_delta_kwh) < 5
                          ? 'success'
                          : Math.abs(invoice_delta_kwh) < 20
                          ? 'warning'
                          : 'destructive'
                      }
                    >
                      {invoice_delta_kwh > 0 ? '+' : ''}{fmtNum(invoice_delta_kwh, 1)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {invoice.notes && (
              <p className="text-xs text-slate-400 italic">{invoice.notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
