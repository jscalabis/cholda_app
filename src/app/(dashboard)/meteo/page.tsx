import { fetchAdvancedWeather } from '@/lib/weather'
import {
  Sun,
  CloudSun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Wind,
  Droplet
} from 'lucide-react'

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

export default async function MeteoPage() {
  const weatherData = await fetchAdvancedWeather()

  if (!weatherData) {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-cream-900 mb-8">Meteorologia</h1>
        <div className="bg-white rounded-xl border border-cream-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <Cloud className="w-12 h-12 text-cream-300 mb-4" />
          <p className="text-cream-600 font-medium">Não foi possível carregar os dados meteorológicos no momento.</p>
          <p className="text-sm text-cream-400 mt-1">Por favor, tente novamente mais tarde.</p>
        </div>
      </div>
    )
  }

  const { current, forecast } = weatherData
  const CurrentIcon = weatherIcons[current.icon] || Cloud

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-cream-900 mb-8">Meteorologia</h1>

      {/* Current Conditions */}
      <div className="bg-white rounded-xl border border-cream-200 p-8 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        <div className="flex flex-col items-center justify-center md:items-start text-center md:text-left">
          <p className="text-sm font-semibold text-cream-500 uppercase tracking-wide mb-2">Condições Atuais</p>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center text-sky-500">
              <CurrentIcon className="w-10 h-10" />
            </div>
            <div>
              <p className="text-6xl font-bold text-cream-900 tracking-tight">{current.temperature.toFixed(0)}°</p>
              <p className="text-lg text-cream-600 font-medium mt-1 capitalize">{current.label}</p>
            </div>
          </div>
        </div>

        <div className="hidden md:block w-px h-auto space-y-24 bg-cream-100 self-stretch"></div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-6 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-cream-500 uppercase">Humidade</p>
              <p className="text-xl font-bold text-cream-900">{current.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-50 text-slate-500 rounded-lg">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-cream-500 uppercase">Vento</p>
              <p className="text-xl font-bold text-cream-900">{current.windSpeed} <span className="text-sm text-cream-500">km/h</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Chart/Table */}
      <h2 className="text-lg font-bold text-cream-900 mb-4 mt-10">Previsão 5 Dias</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {forecast.map((day, idx) => {
          const DayIcon = weatherIcons[day.icon] || Cloud
          const date = new Date(day.date)
          const isToday = idx === 0
          const dayName = isToday ? 'Hoje' : date.toLocaleDateString('pt-PT', { weekday: 'short' })
          
          return (
            <div key={day.date} className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col items-center hover:border-sky-300 transition-colors">
              <p className="text-sm font-semibold text-cream-900 mb-1 capitalize">{dayName}</p>
              <p className="text-xs text-cream-500 mb-4">{date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}</p>
              
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 mb-4">
                <DayIcon className="w-8 h-8" />
              </div>
              
              <div className="flex items-center justify-center gap-3 w-full border-t border-cream-50 pt-4">
                <div className="text-center">
                  <p className="text-xs text-cream-400">Min</p>
                  <p className="text-base font-bold text-cream-600">{day.temperatureMin.toFixed(0)}°</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-cream-400">Max</p>
                  <p className="text-base font-bold text-cream-900">{day.temperatureMax.toFixed(0)}°</p>
                </div>
              </div>
              
              {day.precipitationSum > 0 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded w-full justify-center">
                  <Droplet className="w-3 h-3" />
                  {day.precipitationSum} mm
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
