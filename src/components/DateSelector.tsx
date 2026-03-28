'use client'

import React, { useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

interface Props {
  mode: 'day' | 'week' | 'month' | 'year'
  dateValue: string
  prevDate: string
  nextDate: string
  isLatest: boolean
  basePath?: string
  paramPrefix?: string
}

// Derive week value ("YYYY-Www") from a day/month/year dateValue string
function weekValueFromDate(dateValue: string): string {
  // Parse whatever date string we have into a UTC Date
  let d: Date
  if (/^\d{4}$/.test(dateValue)) {
    d = new Date(Date.UTC(parseInt(dateValue), 0, 1))
  } else if (/^\d{4}-\d{2}$/.test(dateValue)) {
    const [y, m] = dateValue.split('-').map(Number)
    d = new Date(Date.UTC(y, m - 1, 1))
  } else if (/^\d{4}-W\d{1,2}$/.test(dateValue)) {
    return dateValue // already a week value
  } else {
    d = new Date(dateValue)
  }
  // ISO week helpers
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const isoYear = tmp.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const isoWeek = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`
}

export function DateSelector({ mode, dateValue, prevDate, nextDate, isLatest, basePath, paramPrefix = '' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const path = basePath || pathname
  const modeKey = paramPrefix ? `${paramPrefix}mode` : 'mode'
  const dateKey = paramPrefix ? `${paramPrefix}date` : 'date'

  const dateInputRef = useRef<HTMLInputElement>(null)

  const handleCalendarClick = () => {
    try {
      if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        dateInputRef.current.showPicker()
      } else {
        dateInputRef.current?.focus()
      }
    } catch {
      dateInputRef.current?.focus()
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      const sp = new URLSearchParams(searchParams.toString())
      sp.set(modeKey, mode)
      sp.set(dateKey, val)
      router.push(`${path}?${sp.toString()}`, { scroll: false })
    }
  }

  // Derive date parts for building sibling-mode links
  let parts = ['2026', '01', '01']
  if (dateValue && !/^(\d{4})-W/.test(dateValue)) {
    parts = dateValue.split('-')
  } else if (/^(\d{4})-W/.test(dateValue)) {
    // Week value — extract year, use Jan 1 as placeholder for day/month
    parts = [dateValue.split('-')[0], '01', '01']
  }
  const y = parts[0]
  const m = parts[1] || '01'
  const d = parts[2] || '01'

  const makeLink = (newMode: string, newDate: string) => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set(modeKey, newMode)
    sp.set(dateKey, newDate)
    return `${path}?${sp.toString()}`
  }

  const spPrev = new URLSearchParams(searchParams.toString())
  spPrev.set(modeKey, mode)
  spPrev.set(dateKey, prevDate)

  const spNext = new URLSearchParams(searchParams.toString())
  spNext.set(modeKey, mode)
  spNext.set(dateKey, nextDate)

  const inputType = mode === 'day' ? 'date' : mode === 'week' ? 'week' : mode === 'month' ? 'month' : 'number'

  const MODES = [
    { key: 'day',   label: 'Dia',    href: makeLink('day',   `${y}-${m}-${d}`) },
    { key: 'week',  label: 'Semana', href: makeLink('week',  weekValueFromDate(dateValue)) },
    { key: 'month', label: 'Mês',    href: makeLink('month', `${y}-${m}`) },
    { key: 'year',  label: 'Ano',    href: makeLink('year',  y) },
  ]

  return (
    <div className="flex items-center gap-4 bg-cream-50 p-1.5 rounded-lg border border-cream-200">
      {/* Mode buttons */}
      <div className="flex items-center sm:border-r sm:border-cream-200 sm:pr-2 sm:mr-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {MODES.map(({ key, label, href }, idx) => {
          const isActive = mode === key
          const isFirst = idx === 0
          const isLast = idx === MODES.length - 1
          return (
            <Link
              key={key}
              href={href}
              scroll={false}
              className={[
                'px-3 py-1.5 text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap min-w-[60px] text-center',
                isFirst  ? 'rounded-l-lg' : 'border-l-0',
                isLast   ? 'rounded-r-lg border-r' : '',
                isActive
                  ? 'bg-forest-600 text-white border-forest-600 shadow-sm z-10'
                  : 'bg-white text-cream-600 border-cream-200 hover:text-cream-900',
              ].join(' ')}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Prev / date display / Next */}
      <div className="flex items-center gap-1 relative">
        <Link
          href={`${path}?${spPrev.toString()}`}
          scroll={false}
          className="p-1.5 rounded text-cream-400 hover:text-cream-700 hover:bg-cream-100"
        >
          &lt;
        </Link>

        <div
          className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-cream-900 min-w-[120px] justify-center bg-white border border-cream-200 rounded cursor-pointer relative"
          onClick={handleCalendarClick}
        >
          {dateValue}
          <Calendar className="w-4 h-4 text-cream-400" />

          <input
            ref={dateInputRef}
            type={inputType}
            min={mode === 'year' ? '2000' : undefined}
            max={mode === 'year' ? '2100' : undefined}
            value={dateValue}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ accentColor: 'var(--color-forest-600)', colorScheme: 'light' }}
          />
        </div>

        <Link
          href={isLatest ? '#' : `${path}?${spNext.toString()}`}
          scroll={false}
          className={`p-1.5 rounded ${isLatest ? 'text-cream-300 pointer-events-none' : 'text-cream-400 hover:text-cream-700 hover:bg-cream-100'}`}
        >
          &gt;
        </Link>
      </div>
    </div>
  )
}
