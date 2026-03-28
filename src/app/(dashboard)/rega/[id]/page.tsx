import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Edit2, Play, Power, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { fmtNum } from '@/lib/utils'
import { ProductionChart } from '@/components/charts/ProductionChart'
import { WaterMmChart } from '@/components/charts/WaterMmChart'
import { DateSelector } from '@/components/DateSelector'
import { PumpWaterParamsDialog } from '@/components/rega/PumpWaterParamsDialog'
import { parseDateSelectorParams } from '@/lib/dateSelector'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  return `${fmtNum(kwh, 1)} kWh`
}
function fmtHours(minutes: number): string {
  return `${fmtNum(minutes / 60, 1)} h`
}
function fmtMm(mm: number): string {
  return `${fmtNum(mm, 1)} mm`
}

export default async function PumpDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string; date?: string }>
}) {
  const [{ id }, resolvedSearch, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ])

  const deviceId = decodeURIComponent(id)
  const today = new Date()

  const { mode, dateValue, startOfPeriod, endOfPeriod, prevDate, nextDate, isLatest, label } =
    parseDateSelectorParams(resolvedSearch.mode, resolvedSearch.date)

  // Truncation level for timeseries RPC
  const trunc = mode === 'day' ? 'hour' : mode === 'year' ? 'month' : 'day'

  // Previous period bounds (for comparison KPI)
  const prevParams = parseDateSelectorParams(mode, prevDate)

  const [deviceRes, paramsRes, periodRes, prevPeriodRes, timeseriesRes] = await Promise.all([
    supabase.from('pump_devices').select('device_id, display_name').eq('device_id', deviceId).single(),
    supabase.from('pump_water_params').select('method, mm_per_unit, notes').eq('device_id', deviceId).maybeSingle(),
    supabase.rpc('get_pump_brackets_sum', {
      start_date: startOfPeriod.toISOString(),
      end_date:   endOfPeriod.toISOString(),
    }).eq('device_id', deviceId).maybeSingle(),
    supabase.rpc('get_pump_brackets_sum', {
      start_date: prevParams.startOfPeriod.toISOString(),
      end_date:   prevParams.endOfPeriod.toISOString(),
    }).eq('device_id', deviceId).maybeSingle(),
    supabase.rpc('get_pump_brackets_timeseries', {
      p_device_id: deviceId,
      start_date:  startOfPeriod.toISOString(),
      end_date:    endOfPeriod.toISOString(),
      p_trunc:     trunc,
    }),
  ])

  if (!deviceRes.data) notFound()

  const device     = deviceRes.data
  const wpParams   = paramsRes.data
  const periodKwh  = Number((periodRes.data as any)?.total_kwh)     || 0
  const periodMins = Number((periodRes.data as any)?.total_minutes_on) || 0
  const prevKwh    = Number((prevPeriodRes.data as any)?.total_kwh)  || 0

  // Water applied for period
  const periodMm = (() => {
    if (!wpParams?.method || wpParams.mm_per_unit == null) return null
    if (wpParams.method === 'kwh')    return periodKwh * wpParams.mm_per_unit
    if (wpParams.method === 'minutes') return (periodMins / 60) * wpParams.mm_per_unit
    return null
  })()

  // kWh diff vs previous period
  const kwhDiff    = periodKwh - prevKwh
  const kwhDiffPct = prevKwh > 0 ? (kwhDiff / prevKwh) * 100 : 0

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartDataMap = new Map<string, number | null>()
  const mmDataMap    = new Map<string, number | null>()
  const now = new Date()
  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const MONTHS     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  if (mode === 'day') {
    for (let i = 0; i < 24; i++) chartDataMap.set(i.toString().padStart(2,'0') + ':00', null)
    for (const row of timeseriesRes.data ?? []) {
      const h = new Date(row.bucket).getUTCHours()
      chartDataMap.set(h.toString().padStart(2,'0') + ':00', Number(row.total_kwh) || 0)
    }
    if (isLatest) {
      for (let i = now.getUTCHours() + 1; i < 24; i++)
        chartDataMap.set(i.toString().padStart(2,'0') + ':00', null)
    }
  } else if (mode === 'week') {
    for (const l of DAY_LABELS) chartDataMap.set(l, null)
    for (const row of timeseriesRes.data ?? []) {
      const dow = (new Date(row.bucket).getUTCDay() + 6) % 7
      chartDataMap.set(DAY_LABELS[dow], Number(row.total_kwh) || 0)
    }
    if (isLatest) {
      const todayDow = (now.getUTCDay() + 6) % 7
      for (let i = todayDow + 1; i < 7; i++) chartDataMap.set(DAY_LABELS[i], null)
    }
  } else if (mode === 'month') {
    const totalDays = new Date(today.getFullYear(), startOfPeriod.getMonth() + 1, 0).getDate()
    for (let i = 1; i <= totalDays; i++) chartDataMap.set(i.toString().padStart(2,'0'), null)
    for (const row of timeseriesRes.data ?? []) {
      chartDataMap.set(new Date(row.bucket).getUTCDate().toString().padStart(2,'0'), Number(row.total_kwh) || 0)
    }
    if (isLatest) {
      for (let i = now.getUTCDate() + 1; i <= totalDays; i++)
        chartDataMap.set(i.toString().padStart(2,'0'), null)
    }
  } else {
    for (const m of MONTHS) chartDataMap.set(m, null)
    for (const row of timeseriesRes.data ?? []) {
      chartDataMap.set(MONTHS[new Date(row.bucket).getUTCMonth()], Number(row.total_kwh) || 0)
    }
    if (isLatest) {
      for (let i = now.getUTCMonth() + 1; i < 12; i++) chartDataMap.set(MONTHS[i], null)
    }
  }

  const kwhChartData = Array.from(chartDataMap.entries()).map(([label, kwh]) => ({
    label,
    kwh: kwh !== null ? Math.round(kwh * 10) / 10 : null,
  }))

  // mm chart — same time buckets, converted from kWh or minutes
  if (wpParams?.method && wpParams.mm_per_unit != null) {
    for (const [lbl] of chartDataMap) mmDataMap.set(lbl, null)
    for (const row of timeseriesRes.data ?? []) {
      let lbl: string
      if (mode === 'day') {
        lbl = new Date(row.bucket).getUTCHours().toString().padStart(2,'00') + ':00'
      } else if (mode === 'week') {
        lbl = DAY_LABELS[(new Date(row.bucket).getUTCDay() + 6) % 7]
      } else if (mode === 'month') {
        lbl = new Date(row.bucket).getUTCDate().toString().padStart(2,'0')
      } else {
        lbl = MONTHS[new Date(row.bucket).getUTCMonth()]
      }
      const mm = wpParams.method === 'kwh'
        ? Number(row.total_kwh) * wpParams.mm_per_unit
        : (Number(row.total_minutes_on) / 60) * wpParams.mm_per_unit
      mmDataMap.set(lbl, Math.round(mm * 10) / 10)
    }
    // clear future slots
    for (const [lbl, v] of chartDataMap) {
      if (v === null) mmDataMap.set(lbl, null)
    }
  }

  const mmChartData = Array.from(mmDataMap.entries()).map(([name, mm]) => ({ name, mm: mm ?? 0 }))

  // ── Breakdown table rows ────────────────────────────────────────────────────
  const breakdownRows = Array.from(chartDataMap.entries())
    .filter(([, kwh]) => kwh !== null && kwh > 0)
    .map(([lbl, kwh]) => {
      const mmRow = mmDataMap.get(lbl) ?? null
      // find minutes from timeseries
      let mins = 0
      for (const row of timeseriesRes.data ?? []) {
        let rowLbl: string
        if (mode === 'day') rowLbl = new Date(row.bucket).getUTCHours().toString().padStart(2,'00') + ':00'
        else if (mode === 'week') rowLbl = DAY_LABELS[(new Date(row.bucket).getUTCDay() + 6) % 7]
        else if (mode === 'month') rowLbl = new Date(row.bucket).getUTCDate().toString().padStart(2,'0')
        else rowLbl = MONTHS[new Date(row.bucket).getUTCMonth()]
        if (rowLbl === lbl) mins = Number(row.total_minutes_on) || 0
      }
      return { lbl, kwh: kwh ?? 0, mins, mm: mmRow }
    })

  const graphTitle    = mode === 'day'   ? 'Consumo Horário'
                      : mode === 'week'  ? 'Consumo Diário'
                      : mode === 'month' ? 'Consumo Diário'
                      : 'Consumo Mensal'
  const labelPrefix   = mode === 'day' ? 'Hora' : mode === 'year' ? 'Mês' : 'Dia'

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto pb-12 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/rega" className="p-2 bg-cream-100 text-cream-600 rounded-lg hover:bg-cream-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-cream-900">
              {device.display_name ?? device.device_id}
            </h1>
            <p className="text-sm text-cream-400 font-mono mt-0.5">{device.device_id}</p>
          </div>
        </div>
        <PumpWaterParamsDialog
          deviceId={device.device_id}
          displayName={device.display_name ?? device.device_id}
          existing={wpParams ? { method: wpParams.method, mm_per_unit: wpParams.mm_per_unit, notes: wpParams.notes ?? null } : null}
        />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Consumo Elétrico</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{fmtKwh(periodKwh)}</p>
          <p className="text-xs text-cream-400 mt-1">{label}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Horas de Funcionamento</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{fmtHours(periodMins)}</p>
          <p className="text-xs text-cream-400 mt-1">{label}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Água Aplicada</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">
            {periodMm !== null ? fmtMm(periodMm) : <span className="text-cream-300 text-lg">Sem param.</span>}
          </p>
          <p className="text-xs text-cream-400 mt-1">{label}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">vs. Período Anterior</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">{fmtKwh(prevKwh)}</p>
          </div>
          {prevKwh > 0 && (
            <div className="flex items-center mt-2">
              {kwhDiff <= 0 ? (
                <span className="flex items-center text-xs font-medium text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(kwhDiffPct), 1)}% consumo
                </span>
              ) : (
                <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(kwhDiffPct), 1)}% consumo
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-cream-900">{graphTitle}</h2>
            <p className="text-sm text-cream-500">{label}</p>
          </div>
          <DateSelector
            mode={mode}
            dateValue={dateValue}
            prevDate={prevDate}
            nextDate={nextDate}
            isLatest={isLatest}
          />
        </div>
        <ProductionChart
          data={kwhChartData}
          labelFormatterPrefix={labelPrefix}
          chartType={mode === 'day' ? 'line' : 'bar'}
        />
      </div>

      {/* Water mm chart — only if params configured */}
      {wpParams?.method && wpParams.mm_per_unit != null && (
        <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-cream-900 mb-1">Água Aplicada (mm)</h2>
          <p className="text-sm text-cream-500 mb-6">{label}</p>
          <WaterMmChart data={mmChartData} />
        </div>
      )}

      {/* Breakdown table */}
      {breakdownRows.length > 0 && (
        <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-cream-100">
            <h2 className="text-sm font-semibold text-cream-700 uppercase tracking-wide">
              Detalhe por {labelPrefix}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream-50 border-b border-cream-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">{labelPrefix}</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">Consumo</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">Horas</th>
                  {wpParams?.method && (
                    <th className="text-right px-6 py-3 text-xs font-semibold text-cream-500 uppercase tracking-wide">Água (mm)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-50">
                {breakdownRows.map(({ lbl, kwh, mins, mm }) => (
                  <tr key={lbl} className="hover:bg-cream-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-cream-900">{lbl}</td>
                    <td className="px-6 py-3 text-right font-semibold text-forest-700">{fmtKwh(kwh)}</td>
                    <td className="px-6 py-3 text-right text-cream-600">{fmtHours(mins)}</td>
                    {wpParams?.method && (
                      <td className="px-6 py-3 text-right font-semibold text-blue-700">
                        {mm !== null ? fmtMm(mm) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
