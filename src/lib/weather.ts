// Open-Meteo API — free, no API key required
// Coordinates for Cholda / Golegã area, Portugal
const LATITUDE = 39.4
const LONGITUDE = -8.48

export interface WeatherData {
  temperature: number
  weatherCode: number
  label: string
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'cloud-drizzle' | 'cloud-rain' | 'cloud-lightning' | 'cloud-snow' | 'cloud-fog'
}

/**
 * Map WMO weather codes to labels and icon keys
 * https://open-meteo.com/en/docs#weathervariables
 */
function mapWeatherCode(code: number): { label: string; icon: WeatherData['icon'] } {
  if (code === 0) return { label: 'Céu limpo', icon: 'sun' }
  if (code <= 3) return { label: 'Parcialmente nublado', icon: 'cloud-sun' }
  if (code <= 48) return { label: 'Nevoeiro', icon: 'cloud-fog' }
  if (code <= 57) return { label: 'Chuvisco', icon: 'cloud-drizzle' }
  if (code <= 67) return { label: 'Chuva', icon: 'cloud-rain' }
  if (code <= 77) return { label: 'Neve', icon: 'cloud-snow' }
  if (code <= 82) return { label: 'Aguaceiros', icon: 'cloud-rain' }
  if (code <= 86) return { label: 'Neve forte', icon: 'cloud-snow' }
  if (code <= 99) return { label: 'Trovoada', icon: 'cloud-lightning' }
  return { label: 'Desconhecido', icon: 'cloud' }
}

export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,weather_code&timezone=Europe%2FLisbon`
    const res = await fetch(url, { next: { revalidate: 900 } }) // cache 15 min
    if (!res.ok) return null

    const data = await res.json()
    const temperature = data.current.temperature_2m as number
    const weatherCode = data.current.weather_code as number
    const { label, icon } = mapWeatherCode(weatherCode)

    return { temperature, weatherCode, label, icon }
  } catch {
    return null
  }
}

export interface ForecastDay {
  date: string
  temperatureMin: number
  temperatureMax: number
  precipitationSum: number
  weatherCode: number
  label: string
  icon: WeatherData['icon']
}

export interface AdvancedWeatherData {
  current: WeatherData & {
    humidity: number
    windSpeed: number
  }
  forecast: ForecastDay[]
}

export async function fetchAdvancedWeather(): Promise<AdvancedWeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FLisbon`
    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1 hour
    if (!res.ok) return null

    const data = await res.json()
    
    const currTemp = data.current.temperature_2m as number
    const currCode = data.current.weather_code as number
    const humidity = data.current.relative_humidity_2m as number
    const windSpeed = data.current.wind_speed_10m as number
    const { label: currLabel, icon: currIcon } = mapWeatherCode(currCode)

    const forecast: ForecastDay[] = []
    
    if (data.daily && data.daily.time) {
      for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
        const code = data.daily.weather_code[i]
        const { label, icon } = mapWeatherCode(code)
        forecast.push({
          date: data.daily.time[i],
          temperatureMin: data.daily.temperature_2m_min[i],
          temperatureMax: data.daily.temperature_2m_max[i],
          precipitationSum: data.daily.precipitation_sum[i],
          weatherCode: code,
          label,
          icon
        })
      }
    }

    return {
      current: {
        temperature: currTemp,
        weatherCode: currCode,
        label: currLabel,
        icon: currIcon,
        humidity,
        windSpeed,
      },
      forecast
    }
  } catch {
    return null
  }
}
