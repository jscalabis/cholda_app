import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { computeHourlyBalance, computeMonthlySummary } from '@/lib/energy'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { Button } from '@/components/ui/button'
import { formatKwh, formatPercent, toMonthKey, monthRange } from '@/lib/utils'
import type { Location, ProductionHourlyRow, ConsumptionHourlyRow, PvModePeriod, GridInvoice } from '@/lib/types'

// Force dynamic so month param works correctly server-side
export const dynamic = 'force-dynamic'

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = monthParam ?? toMonthKey(new Date())
  const { start, end } = monthRange(month)

  const supabase = await createClient()

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (!locations?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <p className="text-slate-500 text-sm mb-4">
          Nenhuma localização configurada ainda.
        </p>
        <Button asChild size="sm">
          <Link href="/settings">
            <Plus className="h-4 w-4 mr-1" />
            Criar localização
          </Link>
        </Button>
      </div>
    )
  }

  // Fetch data for all locations in parallel
  const locationData = await Promise.all(
    locations.map(async (loc: Location) => {
      const [prodRes, consRes, periodsRes, invoiceRes] = await Promise.all([
        supabase
          .from('v_production_hourly')
          .select('*')
          .eq('location_id', loc.id)
          .gte('hour_start', start.toISOString())
          .lte('hour_start', end.toISOString()),
        supabase
          .from('v_consumption_hourly')
          .select('*')
          .eq('location_id', loc.id)
          .gte('hour_start', start.toISOString())
          .lte('hour_start', end.toISOString()),
        supabase
          .from('pv_mode_periods')
          .select('*')
          .eq('location_id', loc.id),
        supabase
          .from('grid_invoices')
          .select('*')
          .eq('location_id', loc.id)
          .eq('period_start', `${month}-01`)
          .maybeSingle(),
      ])

      const hourly = computeHourlyBalance(
        (prodRes.data ?? []) as ProductionHourlyRow[],
        (consRes.data ?? []) as ConsumptionHourlyRow[],
        (periodsRes.data ?? []) as PvModePeriod[]
      )

      const summary = computeMonthlySummary(
        loc.id,
        month,
        hourly,
        invoiceRes.data as GridInvoice | null
      )

      return { location: loc, summary }
    })
  )

  // Month navigator
  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return toMonthKey(d)
  })()
  const nextMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m, 1)
    return toMonthKey(d)
  })()
  const isCurrentMonth = month === toMonthKey(new Date())
  const monthLabel = new Date(start).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 capitalize">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/?month=${prevMonth}`}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"
          >
            ←
          </Link>
          <Link
            href={`/?month=${nextMonth}`}
            className={`px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 ${
              isCurrentMonth ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            →
          </Link>
          {month !== toMonthKey(new Date()) && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md hover:bg-slate-50 text-slate-500"
            >
              Hoje
            </Link>
          )}
        </div>
      </div>

      {/* Location cards */}
      <div className="space-y-6">
        {locationData.map(({ location, summary }) => (
          <div key={location.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">{location.name}</h2>
              <Link
                href={`/locations/${location.id}?month=${month}`}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Ver detalhes
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100">
              <KpiCard
                title="Produção"
                value={formatKwh(summary.total_production_kwh)}
                className="rounded-none border-none shadow-none"
              />
              <KpiCard
                title="Consumo"
                value={formatKwh(summary.total_consumption_kwh)}
                className="rounded-none border-none shadow-none"
              />
              <KpiCard
                title="Autoconsumo"
                value={formatKwh(summary.total_self_consumed_kwh)}
                subtitle={`${formatPercent(summary.autoconsumo_rate * 100)} da produção`}
                trend="up"
                className="rounded-none border-none shadow-none"
              />
              <KpiCard
                title="Rede (consumo)"
                value={formatKwh(summary.grid_consumed_kwh)}
                subtitle={
                  summary.invoice_delta_kwh !== null
                    ? `Δ fatura: ${summary.invoice_delta_kwh > 0 ? '+' : ''}${summary.invoice_delta_kwh.toFixed(1)} kWh`
                    : 'Sem fatura'
                }
                trend={
                  summary.invoice_delta_kwh === null
                    ? 'neutral'
                    : Math.abs(summary.invoice_delta_kwh) < 10
                    ? 'neutral'
                    : summary.invoice_delta_kwh > 0
                    ? 'down'
                    : 'up'
                }
                className="rounded-none border-none shadow-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
