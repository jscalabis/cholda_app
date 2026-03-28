import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Settings } from 'lucide-react'
import { ProductionChart } from '@/components/charts/ProductionChart'
import { DateSelector } from '@/components/DateSelector'
import { parseDateSelectorParams } from '@/lib/dateSelector'
import { notFound } from 'next/navigation'
import { fmtNum, formatEur } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  return `${fmtNum(kwh, 1)} kWh`
}

function fmtCurrency(val: number): string {
  return formatEur(val)
}

export default async function ParkDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string; date?: string; table_mode?: string; table_date?: string }>
}) {
  const [resolvedParams, resolvedSearchParams, supabase] = await Promise.all([
    params,
    searchParams,
    createClient()
  ])
  
  const plantCode = decodeURIComponent(resolvedParams.id)

  const { mode, dateValue, startOfPeriod, endOfPeriod, prevDate, nextDate, isLatest, selectedDate } =
    parseDateSelectorParams(resolvedSearchParams.mode, resolvedSearchParams.date)

  const graphTitle    = mode === 'day'   ? 'Produção Horária'
                      : mode === 'week'  ? 'Produção Diária'
                      : mode === 'month' ? 'Produção Diária'
                      : 'Produção Mensal'
  const graphSubtitle = mode === 'day'   ? 'Curva de produção do dia selecionado'
                      : mode === 'week'  ? 'Produção da semana selecionada'
                      : mode === 'month' ? 'Produção no mês selecionado'
                      : 'Produção no ano selecionado'
  const labelPrefix   = mode === 'day' ? 'Hora' : mode === 'year' ? 'Mês' : 'Dia'
  const kpiStringPrefix = mode === 'day' ? 'Hoje' : mode === 'week' ? 'Semana' : mode === 'month' ? 'Mês' : 'Ano'

  const tableDateParams = parseDateSelectorParams(resolvedSearchParams.table_mode, resolvedSearchParams.table_date, 'year')

  // Historical same-period ranges for comparison KPI (up to 5 previous years)
  // If the current period is still in progress (isLatest), cap historical end dates
  // at the same elapsed point so we compare like-for-like (e.g. March 1–28 vs March 1–28).
  const now = new Date()
  const selectedYear = selectedDate.getFullYear()
  // For per-bar chart averages we only need month/year modes, and 3 years is sufficient
  const numBarAvgYears = (mode === 'month' || mode === 'year') ? 3 : 0

  const historicalRanges: Array<{ start: string; end: string }> = []
  for (let y = 1; y <= 5; y++) {
    if (mode === 'day') {
      // Previous years' same day is always a complete day — no capping needed
      historicalRanges.push({
        start: new Date(selectedYear - y, selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0).toISOString(),
        end:   new Date(selectedYear - y, selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999).toISOString(),
      })
    } else if (mode === 'week') {
      const offset = y * 364 * 24 * 60 * 60 * 1000
      const hStart = new Date(startOfPeriod.getTime() - offset)
      const hEndFull = new Date(endOfPeriod.getTime() - offset)
      // Cap at same elapsed point within the week
      const hEnd = isLatest
        ? new Date(Math.min(hStart.getTime() + (now.getTime() - startOfPeriod.getTime()), hEndFull.getTime()))
        : hEndFull
      historicalRanges.push({ start: hStart.toISOString(), end: hEnd.toISOString() })
    } else if (mode === 'month') {
      // Cap at same day-of-month as today when viewing the current month
      const capDay = isLatest ? now.getDate() : new Date(selectedYear - y, selectedDate.getMonth() + 1, 0).getDate()
      historicalRanges.push({
        start: new Date(selectedYear - y, selectedDate.getMonth(), 1).toISOString(),
        end:   new Date(selectedYear - y, selectedDate.getMonth(), capDay, 23, 59, 59, 999).toISOString(),
      })
    } else {
      // year — cap at same month+day as today when viewing the current year
      const capMonth = isLatest ? now.getMonth() : 11
      const capDay   = isLatest ? now.getDate()  : 31
      historicalRanges.push({
        start: new Date(selectedYear - y, 0, 1).toISOString(),
        end:   new Date(selectedYear - y, capMonth, capDay, 23, 59, 59, 999).toISOString(),
      })
    }
  }

  // Fetch all data in parallel — historical comparison queries are spread at the end
  // barAvg queries: raw energy_readings per historical year for per-bar chart averages (month/year modes only)
  const barAvgRanges = historicalRanges.slice(0, numBarAvgYears)

  const results = await Promise.all([
    /* 0 */ supabase.from('fusion_plants').select('*').eq('plant_code', plantCode).single(),
    /* 1 */ supabase.from('solar_park_details').select('*').eq('plant_code', plantCode).maybeSingle(),
    /* 2 */ supabase
      .from('energy_readings')
      .select('collected_at, production_kwh')
      .eq('plant_code', plantCode)
      .gte('collected_at', startOfPeriod.toISOString())
      .lte('collected_at', endOfPeriod.toISOString()),
    /* 3 */ supabase.rpc('get_energy_readings_sum', {
      start_date: tableDateParams.startOfPeriod.toISOString(),
      end_date:   tableDateParams.endOfPeriod.toISOString(),
    }).eq('plant_code', plantCode).maybeSingle(),
    /* 4 */ supabase.from('invoices')
      .select('*')
      .eq('plant_code', plantCode)
      .eq('invoice_type', 'production')
      .gte('period_start', tableDateParams.startOfPeriod.toISOString())
      .lte('period_end', tableDateParams.endOfPeriod.toISOString()),
    /* 5 */ supabase.from('invoices')
      .select('kwh_value, total_amount')
      .eq('plant_code', plantCode)
      .eq('invoice_type', 'production'),
    // 6..10: Historical same-period sums for KPI comparison
    ...historicalRanges.map(r =>
      supabase.rpc('get_energy_readings_sum', {
        start_date: r.start,
        end_date:   r.end,
      }).eq('plant_code', plantCode).maybeSingle()
    ),
    // 11..13 (or empty): Raw energy_readings for per-bar chart averages
    ...barAvgRanges.map(r =>
      supabase
        .from('energy_readings')
        .select('collected_at, production_kwh')
        .eq('plant_code', plantCode)
        .gte('collected_at', r.start)
        .lte('collected_at', r.end)
    ),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plantRes, detailsRes, periodProdRes, tableProdRes, tableInvoicesRes, allInvoicesKpiRes] = results as any[]
  const historicalProdResults: any[] = results.slice(6, 6 + historicalRanges.length)
  const barAvgRawResults: any[] = results.slice(6 + historicalRanges.length)

  if (!plantRes.data) {
    notFound()
  }

  const plant = plantRes.data
  const details = detailsRes.data || {}
  const tariffPrice = details.tariff_price_kwh ?? 0.05

  // KPI calculations
  const periodProd = (periodProdRes.data ?? []).reduce((sum: number, r: any) => sum + (r.production_kwh ?? 0), 0)
  const periodSales = periodProd * tariffPrice

  // Historical same-period average (exclude years with no data)
  const historicalValues = historicalProdResults
    .map(res => res.data ? ((res.data as any).total_kwh as number || 0) : 0)
    .filter(v => v > 0)
  const comparisonProd = historicalValues.length > 0
    ? historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length
    : null
  const comparisonSales = comparisonProd !== null ? comparisonProd * tariffPrice : null
  const comparisonLabel = mode === 'day' ? 'Méd. mesmo dia anos ant.'
    : mode === 'week'  ? 'Méd. mesma semana anos ant.'
    : mode === 'month' ? 'Méd. mesmo mês anos ant.'
    : 'Méd. anos anteriores'
  const prodDiffPct = comparisonProd && comparisonProd > 0
    ? ((periodProd - comparisonProd) / comparisonProd) * 100
    : null
  const salesDiffPct = comparisonSales && comparisonSales > 0
    ? ((periodSales - comparisonSales) / comparisonSales) * 100
    : null

  // Per-bar historical averages for chart overlay (month = per day-of-month, year = per calendar month)
  const avgByBar = new Map<string, number>()
  if (mode === 'month' && barAvgRawResults.length > 0) {
    // Group raw rows by (yearIndex, day-of-month label), then average across years
    const yearDayTotals: Map<string, number>[] = barAvgRawResults.map(res => {
      const m = new Map<string, number>()
      for (const row of res.data ?? []) {
        const label = new Date(row.collected_at).getUTCDate().toString().padStart(2, '0')
        m.set(label, (m.get(label) ?? 0) + (row.production_kwh ?? 0))
      }
      return m
    })
    const allDayLabels = new Set(yearDayTotals.flatMap(m => [...m.keys()]))
    for (const label of allDayLabels) {
      const vals = yearDayTotals.map(m => m.get(label) ?? 0).filter(v => v > 0)
      if (vals.length > 0) avgByBar.set(label, vals.reduce((a, b) => a + b, 0) / vals.length)
    }
  } else if (mode === 'year' && barAvgRawResults.length > 0) {
    const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const yearMonthTotals: Map<string, number>[] = barAvgRawResults.map(res => {
      const m = new Map<string, number>()
      for (const row of res.data ?? []) {
        const label = MONTHS[new Date(row.collected_at).getUTCMonth()]
        m.set(label, (m.get(label) ?? 0) + (row.production_kwh ?? 0))
      }
      return m
    })
    const allMonthLabels = new Set(yearMonthTotals.flatMap(m => [...m.keys()]))
    for (const label of allMonthLabels) {
      const vals = yearMonthTotals.map(m => m.get(label) ?? 0).filter(v => v > 0)
      if (vals.length > 0) avgByBar.set(label, vals.reduce((a, b) => a + b, 0) / vals.length)
    }
  }

  // All-time invoices KPI
  const allInvKwh = (allInvoicesKpiRes.data ?? []).reduce((s: number, r: any) => s + (r.kwh_value || 0), 0)
  const allInvEur = (allInvoicesKpiRes.data ?? []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0)

  // Details Table 1: Production & Invoices logic
  const tableProd = tableProdRes.data ? ((tableProdRes.data as any).total_kwh || 0) : 0
  const tableSales = tableProd * tariffPrice
  const tableInvKwh = (tableInvoicesRes.data || []).reduce((sum: number, r: any) => sum + (r.kwh_value || 0), 0)
  const tableInvEur = (tableInvoicesRes.data || []).reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0)
  const tableMaint = details.maintenance_cost_total || 0

  // Details Table 1: Invoice Line Items comparisons
  const invoiceList = tableInvoicesRes.data || []
  const invoiceComparisons = await Promise.all(invoiceList.map(async (inv: any) => {
    // get our readings for the exact invoice period
    const startIso = new Date(inv.period_start).toISOString()
    
    const endRaw = new Date(inv.period_end)
    endRaw.setUTCHours(23, 59, 59, 999)
    const endIso = endRaw.toISOString()
    
    const { data: sumData } = await supabase.rpc('get_energy_readings_sum', {
      start_date: startIso,
      end_date: endIso
    }).eq('plant_code', plantCode).maybeSingle()

    const readKwh = sumData ? ((sumData as any).total_kwh || 0) : 0
    const readSales = readKwh * tariffPrice
    
    return {
      ...inv,
      readKwh,
      readSales
    }
  }))

  // Sort invoices most recent period first
  invoiceComparisons.sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime())

  // Graph groupings based on mode
  const chartDataMap = new Map<string, number | null>()

  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  if (mode === 'day') {
    // Pre-fill all 24 hours with null so X axis always shows full day
    for (let i = 0; i < 24; i++) chartDataMap.set(i.toString().padStart(2, '0') + ':00', null)
    for (const row of periodProdRes.data ?? []) {
      const d = new Date(row.collected_at)
      const label = d.getUTCHours().toString().padStart(2, '0') + ':00'
      chartDataMap.set(label, (chartDataMap.get(label) ?? 0) + (row.production_kwh ?? 0))
    }
    // Set future hours (beyond current UTC hour when viewing today) back to null
    if (isLatest) {
      const currentHour = now.getUTCHours()
      for (let i = currentHour + 1; i < 24; i++) {
        chartDataMap.set(i.toString().padStart(2, '0') + ':00', null)
      }
    }
  } else if (mode === 'week') {
    for (const label of DAY_LABELS) chartDataMap.set(label, null)
    for (const row of periodProdRes.data ?? []) {
      const d = new Date(row.collected_at)
      const dow = (d.getUTCDay() + 6) % 7 // 0=Mon … 6=Sun
      const label = DAY_LABELS[dow]
      chartDataMap.set(label, (chartDataMap.get(label) ?? 0) + (row.production_kwh ?? 0))
    }
    if (isLatest) {
      const todayDow = (now.getUTCDay() + 6) % 7
      for (let i = todayDow + 1; i < 7; i++) chartDataMap.set(DAY_LABELS[i], null)
    }
  } else if (mode === 'month') {
    const totalDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
    for (let i = 1; i <= totalDays; i++) chartDataMap.set(i.toString().padStart(2, '0'), null)
    for (const row of periodProdRes.data ?? []) {
      const d = new Date(row.collected_at)
      const label = d.getUTCDate().toString().padStart(2, '0')
      chartDataMap.set(label, (chartDataMap.get(label) ?? 0) + (row.production_kwh ?? 0))
    }
    if (isLatest) {
      const currentDay = now.getUTCDate()
      for (let i = currentDay + 1; i <= totalDays; i++) {
        chartDataMap.set(i.toString().padStart(2, '0'), null)
      }
    }
  } else {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    for (const m of months) chartDataMap.set(m, null)
    for (const row of periodProdRes.data ?? []) {
      const d = new Date(row.collected_at)
      const label = months[d.getUTCMonth()]
      chartDataMap.set(label, (chartDataMap.get(label) ?? 0) + (row.production_kwh ?? 0))
    }
    if (isLatest) {
      const currentMonth = now.getUTCMonth()
      for (let i = currentMonth + 1; i < 12; i++) {
        chartDataMap.set(months[i], null)
      }
    }
  }

  const chartData = Array.from(chartDataMap.entries()).map(([label, kwh]) => {
    const avg = avgByBar.get(label)
    return {
      label,
      kwh: kwh !== null ? Math.round(kwh * 10) / 10 : null,
      avgKwh: avg !== undefined ? Math.round(avg * 10) / 10 : undefined,
    }
  })

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto w-full pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/solar" className="p-2 bg-cream-100 text-cream-600 rounded-lg hover:bg-cream-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-cream-900">{plant.plant_name}</h1>
            <p className="text-sm text-cream-500 mt-1">{plant.plant_address || 'Endereço não definido'}</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-cream-100 text-cream-700 rounded-lg hover:bg-cream-200 transition-colors font-medium text-sm">
             <Settings className="w-4 h-4" />
             Configurar Parque
           </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 1. Production current period + historical comparison */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Produção ({kpiStringPrefix})</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">{fmtKwh(periodProd)}</p>
            {comparisonProd !== null && (
              <p className="text-xs text-cream-400 mt-1">{comparisonLabel}: {fmtKwh(comparisonProd)}</p>
            )}
          </div>
          {prodDiffPct !== null && (
            <div className="flex items-center mt-2">
              {prodDiffPct >= 0 ? (
                <span className="flex items-center text-xs font-medium text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(prodDiffPct), 1)}% vs méd.
                </span>
              ) : (
                <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(prodDiffPct), 1)}% vs méd.
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. Estimated sales current period + historical comparison */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Vendas Estimadas ({kpiStringPrefix})</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">{fmtCurrency(periodSales)}</p>
            {comparisonSales !== null && (
              <p className="text-xs text-cream-400 mt-1">{comparisonLabel}: {fmtCurrency(comparisonSales)}</p>
            )}
          </div>
          {salesDiffPct !== null && (
            <div className="flex items-center mt-2">
              {salesDiffPct >= 0 ? (
                <span className="flex items-center text-xs font-medium text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(salesDiffPct), 1)}% vs méd.
                </span>
              ) : (
                <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  {fmtNum(Math.abs(salesDiffPct), 1)}% vs méd.
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Installed capacity */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Capacidade Instalada</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{fmtNum(plant.capacity_kwp, 1)} kWp</p>
          <p className="text-xs text-cream-400 mt-1">Potência de pico do sistema</p>
        </div>

        {/* 4. All-time invoiced totals */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Total Faturado</p>
          <p className="text-2xl font-bold text-forest-700 mt-1">{fmtCurrency(allInvEur)}</p>
          <p className="text-xs text-cream-500 mt-1">{fmtKwh(allInvKwh)} faturados</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-cream-900">{graphTitle}</h2>
            <p className="text-sm text-cream-500">{graphSubtitle}</p>
          </div>

          <DateSelector 
            mode={mode}
            dateValue={dateValue}
            prevDate={prevDate}
            nextDate={nextDate}
            isLatest={isLatest}
          />
        </div>
        
        <ProductionChart data={chartData} labelFormatterPrefix={labelPrefix} chartType={mode === 'day' ? 'line' : 'bar'} />

      </div>

      {/* Características Técnicas (Table 2) */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-cream-900">Características Técnicas</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8">
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Marca Inversor</p>
            <p className="text-base text-cream-900 font-medium mt-1">{details.inverter_brand || 'Huawei Fusion'}</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Modo Produção</p>
            <p className="text-base text-cream-900 font-medium mt-1">{details.production_mode || 'Tarifa'}</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Preço (Tarifa)</p>
            <p className="text-base text-cream-900 font-medium mt-1">{fmtNum(details.tariff_price_kwh || 0.05, 3)} € / kWh</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Capacidade Instalada</p>
            <p className="text-base text-cream-900 font-medium mt-1">{fmtNum(plant.capacity_kwp, 1)} kWp</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Data Instalação</p>
            <p className="text-base text-cream-900 font-medium mt-1">{details.installation_date ? new Date(details.installation_date).toLocaleDateString('pt-PT') : 'Não definido'}</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Posse</p>
            <p className="text-base text-cream-900 font-medium mt-1">{details.ownership_type === 'Rented' ? 'Alugado' : 'Próprio'}</p>
          </div>
        </div>
      </div>

      {/* Produção e Faturação (Table 1) */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-bold text-cream-900">Produção e Faturação</h2>
          <DateSelector 
            mode={tableDateParams.mode as any}
            dateValue={tableDateParams.dateValue}
            prevDate={tableDateParams.prevDate}
            nextDate={tableDateParams.nextDate}
            isLatest={tableDateParams.isLatest}
            paramPrefix="table_"
          />
        </div>

        {/* Aggregates row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-8 mb-8">
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Produção Líquida (kWh)</p>
            <p className="text-base text-cream-900 font-medium mt-1">{fmtKwh(tableProd)}</p>
            <p className="text-xs text-cream-400 mt-1">Total lido no período</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Vendas (Estimado)</p>
            <p className="text-base text-cream-900 font-medium mt-1">{fmtCurrency(tableSales)}</p>
            <p className="text-xs text-cream-400 mt-1">Baseado nos contadores</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Faturado (kWh)</p>
            <p className="text-base text-forest-700 font-medium mt-1">{fmtKwh(tableInvKwh)}</p>
            <p className="text-xs text-cream-400 mt-1">Somas das faturas</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Faturado (€)</p>
            <p className="text-base text-forest-700 font-bold mt-1">{fmtCurrency(tableInvEur)}</p>
            <p className="text-xs text-cream-400 mt-1">Somas das faturas</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Manutenção</p>
            <p className="text-base text-cream-900 font-medium mt-1">{fmtCurrency(tableMaint)}</p>
          </div>
        </div>

        {/* Detailed Invoices Comparison */}
        {invoiceComparisons.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-cream-900 mb-4 uppercase tracking-wide border-b border-cream-100 pb-2">Lista de Faturas Associadas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-cream-500 border-b border-cream-200">
                    <th className="font-semibold py-3 pr-4">Documento</th>
                    <th className="font-semibold py-3 px-4">Período</th>
                    <th className="font-semibold py-3 px-4 text-right bg-cream-50/50">Faturado (kWh)</th>
                    <th className="font-semibold py-3 px-4 text-right bg-cream-50/50">Lido Nosso (kWh)</th>
                    <th className="font-semibold py-3 px-4 text-right">Faturado Valor (€)</th>
                    <th className="font-semibold py-3 px-4 text-right">Valor Nosso (€)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-100">
                  {invoiceComparisons.map(inv => (
                    <tr key={inv.id} className="hover:bg-cream-50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-cream-900">
                        {inv.document_number || <span className="text-cream-400 italic">S/ Doc</span>}
                      </td>
                      <td className="py-3 px-4 text-cream-600">
                        {new Date(inv.period_start).toLocaleDateString('pt-PT')} – {new Date(inv.period_end).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-forest-700 bg-forest-50/30">
                        {fmtNum(inv.kwh_value, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-cream-700 bg-cream-50/30">
                        {fmtNum(inv.readKwh, 1)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-forest-700">
                        {fmtCurrency(inv.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-cream-700">
                        {fmtCurrency(inv.readSales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
