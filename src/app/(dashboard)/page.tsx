import Link from 'next/link'
import {
  Sun,
  Droplets,
  Zap,
  Cloud,
  CloudSun,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fetchCurrentWeather } from '@/lib/weather'
import { SpecificYieldChart } from '@/components/charts/SpecificYieldChart'
import type { YieldDataPoint } from '@/components/charts/SpecificYieldChart'
import { DateSelector } from '@/components/DateSelector'

export const dynamic = 'force-dynamic'

const weatherIcons = {
  'sun': Sun,
  'cloud-sun': CloudSun,
  'cloud': Cloud,
  'cloud-drizzle': CloudDrizzle,
  'cloud-rain': CloudRain,
  'cloud-lightning': CloudLightning,
  'cloud-snow': CloudSnow,
  'cloud-fog': CloudFog,
} as const

export default async function DashboardPage(
  props: { searchParams: Promise<{ [key: string]: string | undefined }> }
) {
  const supabase = await createClient()

  // Time windows (Real-time KPIs)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()
  
  // Time windows (Specific Yield Chart)
  const searchParams = await props.searchParams
  const mode = (searchParams.mode as 'day' | 'month' | 'year') || 'day'
  const dateParam = searchParams.date

  const today = new Date()
  let selectedDate = today
  if (dateParam) {
    const parsed = new Date(dateParam)
    if (!isNaN(parsed.getTime())) selectedDate = parsed
  }

  let startOfPeriod: Date
  let endOfPeriod: Date
  let dateValue = ''
  let prevDate = ''
  let nextDate = ''
  let isLatest = false
  if (mode === 'day') {
    dateValue = selectedDate.toISOString().split('T')[0]
    isLatest = dateValue === today.toISOString().split('T')[0]
    startOfPeriod = new Date(dateValue + 'T00:00:00Z')
    endOfPeriod = new Date(dateValue + 'T23:59:59.999Z')

    const p = new Date(startOfPeriod)
    p.setDate(p.getDate() - 1)
    prevDate = p.toISOString().split('T')[0]

    const n = new Date(startOfPeriod)
    n.setDate(n.getDate() + 1)
    nextDate = n.toISOString().split('T')[0]
  } else if (mode === 'month') {
    const y = selectedDate.getFullYear()
    const m = selectedDate.getMonth()
    dateValue = `${y}-${(m+1).toString().padStart(2, '0')}`
    isLatest = (y === today.getFullYear() && m === today.getMonth())

    startOfPeriod = new Date(y, m, 1)
    endOfPeriod = new Date(y, m + 1, 0, 23, 59, 59, 999)

    const p = new Date(y, m - 1, 1)
    prevDate = `${p.getFullYear()}-${(p.getMonth()+1).toString().padStart(2, '0')}`

    const n = new Date(y, m + 1, 1)
    nextDate = `${n.getFullYear()}-${(n.getMonth()+1).toString().padStart(2, '0')}`
  } else {
    // year
    const y = selectedDate.getFullYear()
    dateValue = y.toString()
    isLatest = (y >= today.getFullYear())

    startOfPeriod = new Date(y, 0, 1)
    endOfPeriod = new Date(y, 11, 31, 23, 59, 59, 999)

    prevDate = (y - 1).toString()
    nextDate = (y + 1).toString()
  }

  const chartStartISO = startOfPeriod.toISOString()
  const chartEndISO = endOfPeriod.toISOString()

  // Fetch all data in parallel
  const [
    plantsRes,
    pumpsRes,
    recentProductionRes,
    recentConsumptionRes,
    todayReadingsRes,
    currentPriceRes,
    weather,
  ] = await Promise.all([
    // All active plants with capacity
    supabase
      .from('fusion_plants')
      .select('plant_code, plant_name, capacity_kwp')
      .eq('is_active', true)
      .order('plant_name'),
    // All active pumps
    supabase.from('pump_devices').select('device_id').eq('is_active', true),
    // Last hour production (for KPI status) - direct query, not through location-filtered view
    supabase
      .from('energy_readings')
      .select('plant_code, production_kwh')
      .gte('collected_at', oneHourAgo)
      .lte('collected_at', now)
      .gt('production_kwh', 0),
    // Last hour consumption (for KPI status) - direct query, not through location-filtered view
    supabase
      .from('pump_brackets')
      .select('device_id, kwh_consumed')
      .gte('bracket_end', oneHourAgo)
      .lte('bracket_end', now)
      .gt('kwh_consumed', 0),
    // Date's readings for specific yield chart
    supabase
      .from('energy_readings')
      .select('plant_code, production_kwh')
      .gte('collected_at', chartStartISO)
      .lte('collected_at', chartEndISO),
    // Latest spot price up to the current moment
    supabase
      .from('market_prices')
      .select('price_eur_mwh')
      .lte('market_date', now)
      .order('market_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchCurrentWeather(),
  ])

  if (currentPriceRes.error) console.error('[dashboard] market_prices:', currentPriceRes.error.message)

  const plants = plantsRes.data ?? []
  const totalParks = plants.length
  const totalPumps = (pumpsRes.data ?? []).length
  const currentSpotPrice = currentPriceRes.data?.price_eur_mwh

  // --- Real-time KPI: parks producing in last hour ---
  const producingPlants = new Set<string>()
  for (const row of recentProductionRes.data ?? []) {
    producingPlants.add(row.plant_code)
  }
  const activeParks = producingPlants.size

  // --- Real-time KPI: pumps consuming in last hour ---
  const consumingPumps = new Set<string>()
  for (const row of recentConsumptionRes.data ?? []) {
    consumingPumps.add(row.device_id)
  }
  const activePumps = consumingPumps.size

  // --- Specific yield chart data ---
  // Sum selected period's production per plant
  const todayProductionByPlant = new Map<string, number>()
  for (const row of todayReadingsRes.data ?? []) {
    const prev = todayProductionByPlant.get(row.plant_code) ?? 0
    todayProductionByPlant.set(row.plant_code, prev + (row.production_kwh ?? 0))
  }

  // Step 1: Calculate specific yield per park = production / individual capacity
  const perParkYields = plants.map((p) => {
    const production = todayProductionByPlant.get(p.plant_code) ?? 0
    const capacity = p.capacity_kwp ?? 0
    const specificYield = capacity > 0 ? production / capacity : 0
    return { plant: p, production, capacity, specificYield }
  })

  // Step 2: Average specific yield across all ACTIVE parks (those with production > 0)
  const activeYields = perParkYields.filter((d) => d.production > 0)
  const avgYield = activeYields.length > 0
    ? activeYields.reduce((sum, d) => sum + d.specificYield, 0) / activeYields.length
    : 0

  // Step 3: Normalized value = specific yield / average yield (1.0 = fleet average)
  const yieldData: YieldDataPoint[] = perParkYields.map((d) => {
    const normalized = avgYield > 0 ? d.specificYield / avgYield : 0
    return {
      name: d.plant.plant_name,
      yield: Math.round(normalized * 100) / 100,
      production: Math.round(d.production * 10) / 10,
      capacity: d.capacity,
    }
  })

  // Sort by yield descending so best performers are on the left
  yieldData.sort((a, b) => b.yield - a.yield)

  // Weather icon
  const WeatherIcon = weather ? weatherIcons[weather.icon] : Cloud

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      {/* Status KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Solar Parks */}
        <Link href="/solar" className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex items-start gap-4 hover:border-forest-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 flex-shrink-0 group-hover:scale-110 transition-transform">
            <Sun className="h-5 w-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide group-hover:text-forest-600 transition-colors">Parques Solares</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">
              {activeParks}<span className="text-sm font-medium text-cream-400">/{totalParks}</span>
            </p>
            <p className="text-xs text-cream-500 mt-0.5">
              {activeParks === 0
                ? 'Nenhum a produzir'
                : activeParks === totalParks
                ? 'Todos ativos'
                : `${activeParks} a produzir`}
            </p>
          </div>
        </Link>

        {/* Water Pumps */}
        <Link href="/rega" className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex items-start gap-4 hover:border-forest-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 flex-shrink-0 group-hover:scale-110 transition-transform">
            <Droplets className="h-5 w-5 text-blue-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide group-hover:text-forest-600 transition-colors">Bombas de Rega</p>
            <p className="text-2xl font-bold text-cream-900 mt-1">
              {activePumps}<span className="text-sm font-medium text-cream-400">/{totalPumps}</span>
            </p>
            <p className="text-xs text-cream-500 mt-0.5">
              {activePumps === 0 ? 'Nenhuma ativa' : `${activePumps} em funcionamento`}
            </p>
          </div>
        </Link>

        {/* Grid Energy Price */}
        <Link href="/mercado" className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex items-start gap-4 hover:border-forest-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-50 flex-shrink-0 group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5 text-forest-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide group-hover:text-forest-600 transition-colors">Preço Atual</p>
            {currentSpotPrice !== undefined && currentSpotPrice !== null ? (
               <>
                 <p className="text-2xl font-bold text-cream-900 mt-1">€ {currentSpotPrice.toFixed(2)}</p>
                 <p className="text-xs text-cream-500 mt-0.5">OMIE Tempo Real</p>
               </>
            ) : (
               <>
                 <p className="text-2xl font-bold text-cream-400 mt-1">—</p>
                 <p className="text-xs text-cream-400 mt-0.5">Sem dados de spot hoje</p>
               </>
            )}
          </div>
        </Link>

        {/* Weather */}
        <Link href="/meteo" className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex items-start gap-4 hover:border-forest-300 hover:shadow-md transition-all group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 flex-shrink-0 group-hover:scale-110 transition-transform">
            <WeatherIcon className="h-5 w-5 text-sky-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-cream-500 uppercase tracking-wide group-hover:text-forest-600 transition-colors">Tempo Atual</p>
            {weather ? (
              <>
                <p className="text-2xl font-bold text-cream-900 mt-1">{weather.temperature.toFixed(0)}°C</p>
                <p className="text-xs text-cream-500 mt-0.5 truncate">{weather.label}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-cream-400 mt-1">—</p>
                <p className="text-xs text-cream-400 mt-0.5">Indisponível</p>
              </>
            )}
          </div>
        </Link>
      </div>

      {/* Specific Yield Chart */}
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
          <div>
            <h2 className="font-semibold text-cream-900">Rendimento Específico</h2>
            <p className="text-xs text-cream-500 mt-0.5">
              Rendimento normalizado (1.0 = média da frota: {avgYield.toFixed(2)} kWh/kWp)
            </p>
            <p className="text-xs text-cream-400 mt-2">
              {yieldData.filter((d) => d.production > 0).length} de {yieldData.length} parques com produção
            </p>
          </div>
          
          <DateSelector 
            mode={mode}
            dateValue={dateValue}
            prevDate={prevDate}
            nextDate={nextDate}
            isLatest={isLatest}
          />
        </div>
        
        <SpecificYieldChart data={yieldData} />
      </div>
    </div>
  )
}
