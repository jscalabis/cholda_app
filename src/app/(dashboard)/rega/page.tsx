import { Droplets } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PeriodSelector } from '@/components/PeriodSelector'
import { RegaBarChart } from '@/components/charts/RegaBarChart'
import { getPeriodRange } from '@/lib/periods'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`
  return `${kwh.toFixed(1)} kWh`
}

export default async function RegaPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const { period = 'today', from, to } = await searchParams
  const { start, end, label } = getPeriodRange(period, from, to)

  const supabase = await createClient()

  const [pumpsRes, consumptionRes] = await Promise.all([
    supabase
      .from('location_sources')
      .select('pump_device_id, display_name, location_id')
      .eq('source_type', 'pump_device')
      .eq('is_active', true)
      .order('display_name'),
    supabase
      .from('v_consumption_hourly')
      .select('device_id, value_kwh')
      .gte('hour_start', start.toISOString())
      .lte('hour_start', end.toISOString()),
  ])

  const pumps = pumpsRes.data ?? []

  // Aggregate consumption per pump device
  const kwhByPump = new Map<string, number>()
  for (const row of consumptionRes.data ?? []) {
    kwhByPump.set(row.device_id, (kwhByPump.get(row.device_id) ?? 0) + row.value_kwh)
  }

  const chartData = pumps.map(
    (pump: { pump_device_id: string | null; display_name: string | null }) => ({
      name: pump.display_name ?? pump.pump_device_id ?? 'Desconhecido',
      kwh: kwhByPump.get(pump.pump_device_id ?? '') ?? 0,
    })
  )

  const totalKwh = chartData.reduce((sum, d) => sum + d.kwh, 0)

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-100">
            <Droplets className="h-5 w-5 text-forest-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cream-900">Rega</h1>
            <p className="text-xs text-cream-500 mt-0.5">{label}</p>
          </div>
        </div>
        <PeriodSelector current={period} from={from} to={to} basePath="/rega" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total Consumido</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{fmtKwh(totalKwh)}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Bombas Ativas</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{pumps.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-cream-700 mb-5 uppercase tracking-wide">
          Consumo por Bomba de Rega
        </h2>
        <RegaBarChart data={chartData} />
      </div>
    </div>
  )
}
