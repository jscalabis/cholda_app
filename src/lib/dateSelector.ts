// ── ISO week helpers ──────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function getISOYear(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d.getUTCFullYear()
}

function isoWeeksInYear(year: number): number {
  // Dec 28 is always in the last ISO week of the year
  const dec28 = new Date(Date.UTC(year, 11, 28))
  return getISOWeek(dec28)
}

function isoWeekStart(isoYear: number, isoWeek: number): Date {
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const dow = jan4.getUTCDay() || 7
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - dow + 1 + (isoWeek - 1) * 7)
  return monday
}

function formatWeekValue(isoYear: number, isoWeek: number): string {
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseDateSelectorParams(
  modeParam: string | undefined | null,
  dateParam: string | undefined | null,
  defaultMode: 'day' | 'week' | 'month' | 'year' = 'day',
  allowFuture: boolean = false
) {
  const mode = (modeParam as 'day' | 'week' | 'month' | 'year') || defaultMode
  const today = new Date()
  let selectedDate = today

  if (dateParam && dateParam !== 'all') {
    // Handle week format "2026-W13" separately
    if (!/^(\d{4})-W(\d{1,2})$/.test(dateParam)) {
      const parsed = new Date(dateParam)
      if (!isNaN(parsed.getTime())) selectedDate = parsed
    }
  }

  let startOfPeriod: Date
  let endOfPeriod: Date
  let dateValue = ''
  let prevDate = ''
  let nextDate = ''
  let isLatest = false
  let label = 'Hoje'

  if (mode === 'week') {
    // Parse week value from dateParam or default to current week
    let isoYear: number
    let isoWeek: number

    const weekMatch = dateParam?.match(/^(\d{4})-W(\d{1,2})$/)
    if (weekMatch) {
      isoYear = parseInt(weekMatch[1])
      isoWeek = parseInt(weekMatch[2])
    } else {
      isoYear = getISOYear(today)
      isoWeek = getISOWeek(today)
    }

    dateValue = formatWeekValue(isoYear, isoWeek)

    const currentISOYear = getISOYear(today)
    const currentISOWeek = getISOWeek(today)
    isLatest = isoYear === currentISOYear && isoWeek === currentISOWeek

    startOfPeriod = isoWeekStart(isoYear, isoWeek)
    endOfPeriod = new Date(startOfPeriod)
    endOfPeriod.setUTCDate(startOfPeriod.getUTCDate() + 6)
    endOfPeriod.setUTCHours(23, 59, 59, 999)

    // prev week
    let prevWeek = isoWeek - 1
    let prevYear = isoYear
    if (prevWeek < 1) {
      prevYear--
      prevWeek = isoWeeksInYear(prevYear)
    }
    prevDate = formatWeekValue(prevYear, prevWeek)

    // next week
    let nextWeek = isoWeek + 1
    let nextYear = isoYear
    if (nextWeek > isoWeeksInYear(isoYear)) {
      nextWeek = 1
      nextYear++
    }
    nextDate = formatWeekValue(nextYear, nextWeek)

    // Label: "Sem. 13 · 23–29 Mar"
    const endDay = new Date(endOfPeriod)
    const startFmt = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(startOfPeriod)
    const endFmt   = startOfPeriod.getUTCMonth() === endDay.getUTCMonth()
      ? endDay.getUTCDate().toString()
      : new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short' }).format(endDay)
    label = isLatest ? `Semana ${isoWeek}` : `Sem. ${isoWeek} · ${startFmt}–${endFmt}`

  } else if (mode === 'day') {
    dateValue = selectedDate.toISOString().split('T')[0]

    const maxDate = new Date()
    if (allowFuture) maxDate.setDate(maxDate.getDate() + 1)

    isLatest = dateValue === maxDate.toISOString().split('T')[0] || (selectedDate > maxDate)

    startOfPeriod = new Date(dateValue + 'T00:00:00Z')
    endOfPeriod   = new Date(dateValue + 'T23:59:59.999Z')

    const p = new Date(startOfPeriod)
    p.setDate(p.getDate() - 1)
    prevDate = p.toISOString().split('T')[0]

    const n = new Date(startOfPeriod)
    n.setDate(n.getDate() + 1)
    nextDate = n.toISOString().split('T')[0]

    if (dateValue === today.toISOString().split('T')[0]) {
      label = 'Hoje'
    } else {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (dateValue === tomorrow.toISOString().split('T')[0]) {
        label = 'Amanhã'
      } else {
        label = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }).format(selectedDate)
      }
    }
  } else if (mode === 'month') {
    const y = selectedDate.getFullYear()
    const m = selectedDate.getMonth()
    dateValue = `${y}-${(m + 1).toString().padStart(2, '0')}`

    const maxDate = new Date()
    if (allowFuture) maxDate.setMonth(maxDate.getMonth() + 1)
    isLatest = (y === maxDate.getFullYear() && m === maxDate.getMonth()) || (selectedDate > maxDate)

    startOfPeriod = new Date(y, m, 1)
    endOfPeriod   = new Date(y, m + 1, 0, 23, 59, 59, 999)

    const p = new Date(y, m - 1, 1)
    prevDate = `${p.getFullYear()}-${(p.getMonth() + 1).toString().padStart(2, '0')}`

    const n = new Date(y, m + 1, 1)
    nextDate = `${n.getFullYear()}-${(n.getMonth() + 1).toString().padStart(2, '0')}`

    label = (y === today.getFullYear() && m === today.getMonth())
      ? 'Mês Atual'
      : new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(selectedDate)
  } else {
    // year
    const y = selectedDate.getFullYear()
    dateValue = y.toString()

    const maxYear = today.getFullYear() + (allowFuture ? 1 : 0)
    isLatest = (y >= maxYear)

    startOfPeriod = new Date(y, 0, 1)
    endOfPeriod   = new Date(y, 11, 31, 23, 59, 59, 999)

    prevDate = (y - 1).toString()
    nextDate = (y + 1).toString()

    label = y === today.getFullYear() ? 'Ano Atual' : y.toString()
  }

  return {
    mode,
    selectedDate,
    dateValue,
    startOfPeriod,
    endOfPeriod,
    prevDate,
    nextDate,
    isLatest,
    label,
  }
}
