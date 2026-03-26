import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Settings } from 'lucide-react'
import { ProductionChart } from '@/components/charts/ProductionChart'
import { DateSelector } from '@/components/DateSelector'
import { parseDateSelectorParams } from '@/lib/dateSelector'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function fmtKwh(kwh: number): string {
  if (kwh >= 1000) return `${(kwh / 1000).toFixed(2)} MWh`
  return `${kwh.toFixed(1)} kWh`
}

function fmtCurrency(val: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val)
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

  const today = new Date()

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

  // Month periods for comparison (independent of mode, KPI always compares month to prev month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)

  const tableDateParams = parseDateSelectorParams(resolvedSearchParams.table_mode, resolvedSearchParams.table_date, 'year')

  // Fetch data
  const [
    plantRes,
    detailsRes,
    periodProdRes,
    monthProdRes,
    prevMonthProdRes,
    tableProdRes,
    tableInvoicesRes
  ] = await Promise.all([
    supabase.from('fusion_plants').select('*').eq('plant_code', plantCode).single(),
    supabase.from('solar_park_details').select('*').eq('plant_code', plantCode).maybeSingle(),
    supabase.from('energy_readings').select('collected_at, production_kwh').eq('plant_code', plantCode).gte('collected_at', startOfPeriod.toISOString()).lte('collected_at', endOfPeriod.toISOString()),
    supabase.from('energy_readings').select('production_kwh').eq('plant_code', plantCode).gte('collected_at', monthStart.toISOString()).lte('collected_at', monthEnd.toISOString()),
    supabase.from('energy_readings').select('production_kwh').eq('plant_code', plantCode).gte('collected_at', prevMonthStart.toISOString()).lte('collected_at', prevMonthEnd.toISOString()),
    supabase.rpc('get_energy_readings_sum', {
      start_date: tableDateParams.startOfPeriod.toISOString(),
      end_date: tableDateParams.endOfPeriod.toISOString()
    }).eq('plant_code', plantCode).maybeSingle(),
    supabase.from('invoices')
      .select('*')
      .eq('plant_code', plantCode)
      .eq('invoice_type', 'production')
      .gte('period_start', tableDateParams.startOfPeriod.toISOString())
      .lte('period_end', tableDateParams.endOfPeriod.toISOString())
  ])

  if (!plantRes.data) {
    notFound()
  }

  const plant = plantRes.data
  const details = detailsRes.data || {}
  const tariffPrice = details.tariff_price_kwh ?? 0.05

  // KPI calculations
  const periodProd = (periodProdRes.data ?? []).reduce((sum, r) => sum + (r.production_kwh ?? 0), 0)
  const periodSales = periodProd * tariffPrice

  const monthProd = (monthProdRes.data ?? []).reduce((sum, r) => sum + (r.production_kwh ?? 0), 0)
  const monthSales = monthProd * tariffPrice
  
  const prevMonthProd = (prevMonthProdRes.data ?? []).reduce((sum, r) => sum + (r.production_kwh ?? 0), 0)
  const prevMonthSales = prevMonthProd * tariffPrice

  const salesDiff = monthSales - prevMonthSales
  const salesDiffPct = prevMonthSales > 0 ? (salesDiff / prevMonthSales) * 100 : 0

  // Details Table 1: Production & Invoices logic
  const tableProd = tableProdRes.data ? ((tableProdRes.data as any).total_kwh || 0) : 0
  const tableSales = tableProd * tariffPrice
  const tableInvKwh = (tableInvoicesRes.data || []).reduce((sum, r) => sum + (r.kwh_value || 0), 0)
  const tableInvEur = (tableInvoicesRes.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0)
  const tableMaint = details.maintenance_cost_total || 0

  // Details Table 1: Invoice Line Items comparisons
  const invoiceList = tableInvoicesRes.data || []
  const invoiceComparisons = await Promise.all(invoiceList.map(async (inv) => {
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

  const now = new Date()
  const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  if (mode === 'day') {
    // Pre-fill all 24 hours with null so X axis always shows full day
    for (let i = 0; i < 24; i++) chartDataMap.set(i.toString().padStart(2, '0') + ':00', null)
    // Accumulate real readings (initialise to 0 on first hit, then add)
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

  const chartData = Array.from(chartDataMap.entries()).map(([label, kwh]) => ({
    label,
    kwh: kwh !== null ? Math.round(kwh * 10) / 10 : null,
  }))

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto pb-12">
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
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Produção ({kpiStringPrefix})</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{fmtKwh(periodProd)}</p>
          <p className="text-xs text-cream-400 mt-1">Acumulado do período selecionado</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Capacidade Instalada</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{plant.capacity_kwp} kWp</p>
          <p className="text-xs text-cream-400 mt-1">Potência de pico do sistema</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Vendas ({kpiStringPrefix})</p>
          <p className="text-2xl font-bold text-cream-900 mt-1">{fmtCurrency(periodSales)}</p>
          <p className="text-xs text-cream-400 mt-1">Estimativa c/ tarifa ({tariffPrice}€/kWh)</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Vendas do Mês Atual</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">{fmtCurrency(monthSales)}</p>
          </div>
          <div className="flex items-center mt-2">
            {salesDiff >= 0 ? (
              <span className="flex items-center text-xs font-medium text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3 mr-1" />
                {Math.abs(salesDiffPct).toFixed(1)}% vs Mês Ant.
              </span>
            ) : (
              <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <ArrowDownRight className="w-3 h-3 mr-1" />
                {Math.abs(salesDiffPct).toFixed(1)}% vs Mês Ant.
              </span>
            )}
          </div>
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
            <p className="text-base text-cream-900 font-medium mt-1">{details.tariff_price_kwh || 0.05} € / kWh</p>
          </div>
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-medium">Capacidade Instalada</p>
            <p className="text-base text-cream-900 font-medium mt-1">{plant.capacity_kwp} kWp</p>
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
                        {inv.kwh_value.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-cream-700 bg-cream-50/30">
                        {inv.readKwh.toFixed(1)}
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
