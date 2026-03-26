'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'this_week', label: 'Esta Semana' },
  { key: 'last_week', label: 'Semana Passada' },
  { key: 'this_year', label: 'Este Ano' },
  { key: 'custom', label: 'Personalizado' },
] as const

interface Props {
  current: string
  from?: string
  to?: string
  basePath: string
}

export function PeriodSelector({ current, from, to, basePath }: Props) {
  const router = useRouter()
  const [customFrom, setCustomFrom] = useState(from ?? '')
  const [customTo, setCustomTo] = useState(to ?? '')

  function navigate(period: string, f?: string, t?: string) {
    const params = new URLSearchParams({ period })
    if (period === 'custom') {
      if (f) params.set('from', f)
      if (t) params.set('to', t)
    }
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex flex-wrap gap-1 bg-cream-50 p-1 rounded-xl border border-cream-200 shadow-sm">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => navigate(key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap',
              current === key
                ? 'bg-forest-700 text-white shadow-sm'
                : 'text-cream-600 hover:text-cream-900 hover:bg-cream-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {current === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value)
              if (customTo) navigate('custom', e.target.value, customTo)
            }}
            className="text-xs border border-cream-300 rounded-lg px-3 py-1.5 bg-white text-cream-800 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent"
          />
          <span className="text-xs text-cream-400 font-medium">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value)
              if (customFrom) navigate('custom', customFrom, e.target.value)
            }}
            className="text-xs border border-cream-300 rounded-lg px-3 py-1.5 bg-white text-cream-800 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent"
          />
        </div>
      )}
    </div>
  )
}
