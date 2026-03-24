import { Sun } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PeriodSelector } from '@/components/PeriodSelector'
import { SolarBarChart } from '@/components/charts/SolarBarChart'
import { getPeriodRange } from '@/lib/periods'
import type { FusionPlant } from '@/lib/types'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`
  return `${kwh.toFixed(1)} kWh`
}

export default async function SolarPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const { period = 'today', from, to } = await searchParams
  const { start, end, label } = getPeriodRange(period, from, to)

  const supabase = await createClient()

  const [plantsRes, sourcesRes, productionRes, locationsRes] = await Promise.all([
    supabase.from('fusion_plants').select('*').eq('is_active', true).order('plant_name'),
    supabase
      .from('location_sources')
      .select('plant_code, location_id')
      .eq('source_type', 'fusion_plant'),
    supabase
      .from('v_production_hourly')
      .select('plant_code, value_kwh')
      .gte('hour_start', start.toISOString())
      .lte('hour_start', end.toISOString()),
    supabase.from('locations').select('id, name'),
  ])

  const plants: FusionPlant[] = plantsRes.data ?? []

  // Map location_id → location name
  const locationMap = new Map(
    (locationsRes.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name])
  )

  // Map plant_code → location name (group)
  const plantGroupMap = new Map(
    (sourcesRes.data ?? []).map((s: { plant_code: string | null; location_id: string }) => [
      s.plant_code,
      locationMap.get(s.location_id) ?? '—',
    ])
  )

  // Aggregate production per plant
  const productionByPlant = new Map<string, number>()
  for (const row of productionRes.data ?? []) {
    productionByPlant.set(
      row.plant_code,
      (productionByPlant.get(row.plant_code) ?? 0) + row.value_kwh
    )
  }

  const chartData = plants.map((plant) => ({
    name: plant.plant_name,
    kwh: productionByPlant.get(plant.plant_code) ?? 0,
  }))

  const totalKwh = chartData.reduce((sum, d) => sum + d.kwh, 0)
  const totalCapacity = plants.reduce((sum, p) => sum + p.capacity_kwp, 0)

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-100">
            <Sun className="h-5 w-5 text-forest-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-cream-900">Solar</h1>
            <p className="text-xs text-cream-500 mt-0.5">{label}</p>
          </div>
        </div>
        <PeriodSelector current={period} from={from} to={to} basePath="/solar" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total Produzido</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{fmtKwh(totalKwh)}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Parques Ativos</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{plants.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Cap. Total Instalada</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{totalCapacity.toFixed(0)} kWp</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-cream-700 mb-5 uppercase tracking-wide">
          Produção por Parque Solar
        </h2>
        <SolarBarChart data={chartData} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-100">
          <h2 className="text-sm font-semibold text-cream-700 uppercase tracking-wide">Parques Solares</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Nome
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Cap. Instalada
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Localização
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Grupo
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Produção ({label})
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-50">
              {plants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-cream-400 text-sm">
                    Nenhum parque solar configurado.
                  </td>
                </tr>
              ) : (
                plants.map((plant) => (
                  <tr key={plant.plant_code} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-cream-900">{plant.plant_name}</td>
                    <td className="px-6 py-4 text-cream-600">{plant.capacity_kwp} kWp</td>
                    <td className="px-6 py-4 text-cream-600">{plant.plant_address}</td>
                    <td className="px-6 py-4 text-cream-600">
                      {plantGroupMap.get(plant.plant_code) ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-forest-700">
                      {fmtKwh(productionByPlant.get(plant.plant_code) ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-forest-100 text-forest-700 text-xs font-bold hover:bg-forest-200 transition-colors cursor-pointer">
                        +
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
