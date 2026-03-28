import { PriceChart } from '@/components/charts/PriceChart'
import { Zap, Euro, TrendingUp } from 'lucide-react'
import { DateSelector } from '@/components/DateSelector'
import { parseDateSelectorParams } from '@/lib/dateSelector'
import { createClient } from '@/lib/supabase/server'
import { fmtNum } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function MercadoPage(
  props: { searchParams: Promise<{ [key: string]: string | undefined }> }
) {
  const searchParams = await props.searchParams
  // true flag explicitly unlocks future date navigation limits for day-ahead market data
  const { mode, dateValue, startOfPeriod, endOfPeriod, prevDate, nextDate, isLatest } = parseDateSelectorParams(searchParams.mode, searchParams.date, 'day', true)

  const supabase = await createClient()

  // Use ISO strings to properly query the `timestamptz` column boundaries (00:00 to 23:59).
  const startDateISO = startOfPeriod.toISOString()
  const endDateISO   = endOfPeriod.toISOString()

  const { data: rawData, error: priceError } = await supabase
    .from('market_prices')
    .select('market_date, price_eur_mwh')
    .gte('market_date', startDateISO)
    .lte('market_date', endDateISO)
    .order('market_date', { ascending: true })

  if (priceError) console.error('[mercado] market_prices:', priceError.message)

  const pricesData = rawData || []

  // Dynamic Aggregation Engine depending on strict user view layout
  let chartData: { date: string, price: number }[] = []
  let chartSubtitle = ''

  if (pricesData.length === 0) {
    chartSubtitle = 'Não existem dados registados para o período selecionado.'
  } else if (mode === 'day') {
    // Show granular 15-minute / hourly changes depending on returned API resolution natively
    chartSubtitle = 'Histórico ibérico ao detalhe do mercado (€/MWh).'
    chartData = pricesData.map(row => {
      const d = new Date(row.market_date)
      return {
        date: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
        price: Math.round(row.price_eur_mwh * 100) / 100
      }
    })
  } else if (mode === 'month') {
    // Daily block averages
    chartSubtitle = 'Média diária do histórico ibérico de mercado (€/MWh).'
    const byDay = new Map<string, { sum: number, count: number }>()
    for (const row of pricesData) {
      const d = new Date(row.market_date)
      const label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
      const existing = byDay.get(label) || { sum: 0, count: 0 }
      existing.sum += row.price_eur_mwh
      existing.count += 1
      byDay.set(label, existing)
    }
    chartData = Array.from(byDay.entries()).map(([date, { sum, count }]) => ({
      date,
      price: Math.round((sum / count) * 100) / 100
    }))
  } else {
    // Monthly block averages for 'year' or 'all' boundaries
    chartSubtitle = 'Média mensal do histórico ibérico de mercado (€/MWh).'
    const byMonth = new Map<string, { sum: number, count: number }>()
    for (const row of pricesData) {
      const d = new Date(row.market_date)
      const label = d.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })
      const existing = byMonth.get(label) || { sum: 0, count: 0 }
      existing.sum += row.price_eur_mwh
      existing.count += 1
      byMonth.set(label, existing)
    }
    chartData = Array.from(byMonth.entries()).map(([date, { sum, count }]) => ({
      date,
      price: Math.round((sum / count) * 100) / 100
    }))
  }

  // Basic KPIs computation if data exists in active selection boundary
  let displayPrice = 0
  let earliestPrice = 0
  let periodVar = 0

  if (chartData.length > 0) {
    displayPrice = chartData[chartData.length - 1].price
    earliestPrice = chartData[0].price
    if (earliestPrice > 0) {
      periodVar = ((displayPrice - earliestPrice) / earliestPrice) * 100
    }
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto w-full space-y-6">
      <h1 className="text-2xl font-bold text-cream-900 mb-8 flex items-center gap-3">
        <Zap className="w-6 h-6 text-forest-600" /> Preço da Energia na Rede
      </h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Preço (Período Selecionado)</p>
            <Euro className="w-5 h-5 text-cream-400" />
          </div>
          <p className="text-3xl font-bold text-cream-900">
            {chartData.length > 0 ? `€ ${fmtNum(displayPrice, 2)}` : '—'}
          </p>
          <div className="flex items-center mt-3 text-sm">
            {chartData.length > 0 ? (
              <>
                <span className={`font-medium px-2 py-0.5 rounded-full mr-2 ${periodVar > 0 ? 'bg-red-50 text-red-600' : 'bg-forest-50 text-forest-600'}`}>
                  {periodVar > 0 ? '+' : ''}{fmtNum(periodVar, 1)}%
                </span>
                <span className="text-cream-400">vs. início do período</span>
              </>
            ) : (
              <span className="text-cream-400">Sem dados</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide">Evolução do Período</p>
            <TrendingUp className="w-5 h-5 text-cream-400" />
          </div>
          <p className="text-3xl font-bold text-cream-900">
            {chartData.length > 0 ? `€ ${fmtNum(earliestPrice, 2)} ` : '—'}
            {chartData.length > 0 && <span className="text-lg text-cream-400 font-medium">→</span>}
            {chartData.length > 0 && ` € ${fmtNum(displayPrice, 2)}`}
          </p>
          <div className="flex items-center mt-3 text-sm">
             <span className="text-cream-400">{chartData.length} registos agregados</span>
          </div>
        </div>
        
        <div className="bg-forest-50 rounded-xl border border-forest-100 p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-forest-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-forest-900">Integração OMIE Ativa</p>
              <p className="text-xs text-forest-700 mt-1">Os dados apresentados estão ligados diretamente ao Mercado Ibérico em tempo real.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="bg-white rounded-xl border border-cream-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-cream-900 mb-1">Evolução do Preço Spot</h2>
            <p className="text-xs text-cream-500">{chartSubtitle}</p>
          </div>
          
          {/* Dynamic Date Filtering */}
          <DateSelector 
            mode={mode}
            dateValue={dateValue}
            prevDate={prevDate}
            nextDate={nextDate}
            isLatest={isLatest}
          />
        </div>
        
        <PriceChart data={chartData} />
      </div>
    </div>
  )
}
