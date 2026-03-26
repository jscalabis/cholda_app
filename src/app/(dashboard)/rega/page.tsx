import { Droplets } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DateSelector } from '@/components/DateSelector'
import { RegaBarChart } from '@/components/charts/RegaBarChart'
import { WaterMmChart } from '@/components/charts/WaterMmChart'
import { PumpWaterParamsDialog } from '@/components/rega/PumpWaterParamsDialog'
import { parseDateSelectorParams } from '@/lib/dateSelector'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`
  return `${kwh.toFixed(1)} kWh`
}

function fmtMm(mm: number): string {
  return `${mm.toFixed(1)} mm`
}

function fmtHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} h`
}

export default async function RegaPage(
  props: { searchParams: Promise<{ [key: string]: string | undefined }> }
) {
  const searchParams = await props.searchParams
  const { mode, dateValue, startOfPeriod, endOfPeriod, prevDate, nextDate, isLatest, label } = parseDateSelectorParams(searchParams.mode, searchParams.date)

  const supabase = await createClient()

  const [devicesRes, bracketsRes, paramsRes] = await Promise.all([
    supabase
      .from('pump_devices')
      .select('device_id, display_name')
      .eq('is_active', true)
      .order('display_name'),
    // RPC aggregates in Postgres, bypassing the 1000-row REST limit
    supabase.rpc('get_pump_brackets_sum', {
      start_date: startOfPeriod.toISOString(),
      end_date:   endOfPeriod.toISOString(),
    }),
    supabase
      .from('pump_water_params')
      .select('device_id, method, mm_per_unit, notes'),
  ])

  if (paramsRes.error) console.error('[rega] pump_water_params:', paramsRes.error.message)

  const devices = devicesRes.data ?? []

  // Conversion params keyed by device_id (method/mm_per_unit may be null = not yet configured)
  const waterParams = new Map(
    (paramsRes.data ?? []).map(
      (p: { device_id: string; method: string | null; mm_per_unit: number | null; notes: string | null }) => [p.device_id, p]
    )
  )

  // RPC returns one pre-summed row per device — no client-side aggregation needed
  const kwhByDevice     = new Map<string, number>()
  const minutesByDevice = new Map<string, number>()

  for (const row of bracketsRes.data ?? []) {
    kwhByDevice.set(row.device_id, Number(row.total_kwh) || 0)
    minutesByDevice.set(row.device_id, Number(row.total_minutes_on) || 0)
  }

  const kwhChartData = devices.map(
    (d: { device_id: string; display_name: string | null }) => ({
      name: d.display_name ?? d.device_id,
      kwh: kwhByDevice.get(d.device_id) ?? 0,
    })
  )

  // mm chart — only devices with method + mm_per_unit configured
  const mmChartData = devices.map(
    (d: { device_id: string; display_name: string | null }) => {
      const params = waterParams.get(d.device_id)
      let mm = 0
      if (params?.method && params?.mm_per_unit) {
        if (params.method === 'kwh') {
          mm = (kwhByDevice.get(d.device_id) ?? 0) * params.mm_per_unit
        } else if (params.method === 'minutes') {
          // mm_per_unit is stored as mm/hour — convert minutes to hours first
          mm = ((minutesByDevice.get(d.device_id) ?? 0) / 60) * params.mm_per_unit
        }
      }
      return { name: d.display_name ?? d.device_id, mm }
    }
  )

  const totalKwh    = kwhChartData.reduce((sum, d) => sum + d.kwh, 0)
  const totalMm     = mmChartData.reduce((sum, d) => sum + d.mm, 0)
  const activePumps = devices.filter((d: { device_id: string }) => (kwhByDevice.get(d.device_id) ?? 0) > 0).length
  // Configured = has both method and mm_per_unit set
  const mmConfigured = (paramsRes.data ?? []).filter((p: { method: string | null }) => p.method !== null).length
  const hasMmData   = mmChartData.some((d) => d.mm > 0)

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
        <DateSelector
          mode={mode}
          dateValue={dateValue}
          prevDate={prevDate}
          nextDate={nextDate}
          isLatest={isLatest}
        />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total Consumido</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{fmtKwh(totalKwh)}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Bombas com Consumo</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{activePumps}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Água Aplicada</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {hasMmData ? fmtMm(totalMm) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Bombas Param.</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">
            {mmConfigured}/{devices.length}
          </p>
        </div>
      </div>

      {/* kWh chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-cream-700 mb-5 uppercase tracking-wide">
          Consumo Elétrico por Bomba
        </h2>
        <RegaBarChart data={kwhChartData} />
      </div>

      {/* mm water chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-cream-700 uppercase tracking-wide">
            Água Aplicada por Bomba (mm)
          </h2>
          {mmConfigured < devices.length && (
            <span className="text-xs text-cream-400">
              {devices.length - mmConfigured} bomba(s) sem parametrização
            </span>
          )}
        </div>
        <WaterMmChart data={mmChartData} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-cream-100">
          <h2 className="text-sm font-semibold text-cream-700 uppercase tracking-wide">Bombas de Rega</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Nome
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  ID
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Consumo ({label})
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Horas Bomba
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Água (mm)
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">
                  Método
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-50">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-cream-400 text-sm">
                    Nenhuma bomba de rega configurada.
                  </td>
                </tr>
              ) : (
                devices.map((device: { device_id: string; display_name: string | null }) => {
                  const params = waterParams.get(device.device_id)
                  const mm = mmChartData.find((d) => d.name === (device.display_name ?? device.device_id))?.mm ?? 0
                  return (
                    <tr key={device.device_id} className="hover:bg-cream-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-cream-900">
                        {device.display_name ?? device.device_id}
                      </td>
                      <td className="px-6 py-4 text-cream-400 font-mono text-xs">
                        {device.device_id}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-forest-700">
                        {fmtKwh(kwhByDevice.get(device.device_id) ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-cream-600">
                        {fmtHours(minutesByDevice.get(device.device_id) ?? 0)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-700">
                        {params ? fmtMm(mm) : <span className="text-cream-300 font-normal">—</span>}
                      </td>
                      <td className="px-6 py-4 text-cream-500 text-xs">
                        {params ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium">{params.mm_per_unit} mm</span>
                            <span className="text-cream-400">/{params.method === 'kwh' ? 'kWh' : 'h'}</span>
                          </span>
                        ) : (
                          <span className="text-cream-300">Sem parametrização</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <PumpWaterParamsDialog
                          deviceId={device.device_id}
                          displayName={device.display_name ?? device.device_id}
                          existing={params ?? null}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
