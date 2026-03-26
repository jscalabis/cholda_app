export type PeriodKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_year' | 'custom'

export interface PeriodRange {
  start: Date
  end: Date
  label: string
}

export function getPeriodRange(period: string, from?: string, to?: string): PeriodRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today': {
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      return { start: today, end, label: 'Hoje' }
    }
    case 'yesterday': {
      const start = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const end = new Date(today.getTime() - 1)
      return { start, end, label: 'Ontem' }
    }
    case 'this_week': {
      const dayOfWeek = today.getDay()
      const monday = new Date(today.getTime() - ((dayOfWeek + 6) % 7) * 24 * 60 * 60 * 1000)
      return { start: monday, end: now, label: 'Esta Semana' }
    }
    case 'last_week': {
      const dayOfWeek = today.getDay()
      const thisMonday = new Date(today.getTime() - ((dayOfWeek + 6) % 7) * 24 * 60 * 60 * 1000)
      const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
      const lastSunday = new Date(thisMonday.getTime() - 1)
      return { start: lastMonday, end: lastSunday, label: 'Semana Passada' }
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1)
      return { start, end: now, label: 'Este Ano' }
    }
    case 'custom': {
      const start = from ? new Date(from + 'T00:00:00') : today
      const end = to ? new Date(to + 'T23:59:59') : now
      return { start, end, label: 'Personalizado' }
    }
    default: {
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
      return { start: today, end, label: 'Hoje' }
    }
  }
}
