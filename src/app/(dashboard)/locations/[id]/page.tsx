import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { computeHourlyBalance, computeMonthlySummary, computeDeviceBreakdown, aggregateToDailyBuckets } from '@/lib/energy'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { ReconciliationPanel } from '@/components/dashboard/ReconciliationPanel'
import { EnergyBarChart } from '@/components/charts/EnergyBarChart'
import { DonutBreakdown } from '@/components/charts/DonutBreakdown'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKwh, formatPercent, toMonthKey, monthRange, fmtNum } from '@/lib/utils'
import type { Location, LocationSource, ProductionHourlyRow, ConsumptionHourlyRow, PvModePeriod, GridInvoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LocationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { id } = await params
  const { month: monthParam } = await searchParams
  const month = monthParam ?? toMonthKey(new Date())
  const { start, end } = monthRange(month)

  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .single()

  if (!location) notFound()

  const [prodRes, consRes, periodsRes, invoiceRes, sourcesRes] = await Promise.all([
    supabase
      .from('v_production_hourly')
      .select('*')
      .eq('location_id', id)
      .gte('hour_start', start.toISOString())
      .lte('hour_start', end.toISOString()),
    supabase
      .from('v_consumption_hourly')
      .select('*')
      .eq('location_id', id)
      .gte('hour_start', start.toISOString())
      .lte('hour_start', end.toISOString()),
    supabase
      .from('pv_mode_periods')
      .select('*')
      .eq('location_id', id),
    supabase
      .from('grid_invoices')
      .select('*')
      .eq('location_id', id)
      .eq('period_start', `${month}-01`)
      .maybeSingle(),
    supabase
      .from('location_sources')
      .select('*')
      .eq('location_id', id)
      .eq('is_active', true),
  ])

  const production = (prodRes.data ?? []) as ProductionHourlyRow[]
  const consumption = (consRes.data ?? []) as ConsumptionHourlyRow[]
  const periods = (periodsRes.data ?? []) as PvModePeriod[]
  const invoice = invoiceRes.data as GridInvoice | null
  const sources = (sourcesRes.data ?? []) as LocationSource[]

  const hourly = computeHourlyBalance(production, consumption, periods)
  const summary = computeMonthlySummary(id, month, hourly, invoice)
  const dailyBuckets = aggregateToDailyBuckets(hourly)

  // Device labels from sources
  const deviceLabels: Record<string, string> = {}
  for (const src of sources) {
    if (src.pump_device_id) {
      deviceLabels[src.pump_device_id] = src.display_name ?? src.pump_device_id
    }
  }
  const deviceBreakdown = computeDeviceBreakdown(consumption, deviceLabels)

  const monthLabel = new Date(start).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  const prevMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    return toMonthKey(new Date(y, m - 2, 1))
  })()
  const nextMonth = (() => {
    const [y, m] = month.split('-').map(Number)
    return toMonthKey(new Date(y, m, 1))
  })()

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{location.name}</h1>
            <p className="text-sm text-slate-500 capitalize">{monthLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/locations/${id}?month=${prevMonth}`}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"
          >
            ←
          </Link>
          <Link
            href={`/locations/${id}?month=${nextMonth}`}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"
          >
            →
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href={`/locations/${id}/invoices`}>
              <FileText className="h-4 w-4 mr-1" />
              Faturas
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard title="Produção" value={formatKwh(summary.total_production_kwh)} />
        <KpiCard title="Consumo" value={formatKwh(summary.total_consumption_kwh)} />
        <KpiCard
          title="Autoconsumo"
          value={formatKwh(summary.total_self_consumed_kwh)}
          subtitle={`${formatPercent(summary.autoconsumo_rate * 100)} da produção`}
          trend="up"
        />
        <KpiCard
          title="Rede (consumo)"
          value={formatKwh(summary.grid_consumed_kwh)}
        />
      </div>

      {/* Daily bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução diária</CardTitle>
        </CardHeader>
        <CardContent>
          <EnergyBarChart data={dailyBuckets} />
        </CardContent>
      </Card>

      {/* Bottom row: device breakdown + reconciliation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Consumo por bomba</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutBreakdown data={deviceBreakdown} />
          </CardContent>
        </Card>

        <ReconciliationPanel summary={summary} />
      </div>

      {/* Pump device table */}
      {deviceBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Detalhe por dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 text-slate-500 font-medium">Bomba</th>
                  <th className="text-right py-2 text-slate-500 font-medium">kWh</th>
                  <th className="text-right py-2 text-slate-500 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {deviceBreakdown.map((d) => (
                  <tr key={d.device_id} className="border-b border-slate-50">
                    <td className="py-2 text-slate-900">{d.display_name}</td>
                    <td className="py-2 text-right text-slate-700">{fmtNum(d.total_kwh, 1)}</td>
                    <td className="py-2 text-right text-slate-500">{fmtNum(d.percentage, 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
