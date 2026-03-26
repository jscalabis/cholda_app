'use client'

import React, { useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

interface Props {
  plantCode: string
  mode: 'day' | 'month' | 'year'
  dateValue: string // "2026-03-25" | "2026-03" | "2026"
  prevDate: string
  nextDate: string
  isLatest: boolean
}

export function ParkDateSelector({ plantCode, mode, dateValue, prevDate, nextDate, isLatest }: Props) {
  const router = useRouter()
  const dateInputRef = useRef<HTMLInputElement>(null)
  
  // A naive way to toggle the native date pickers using showPicker
  const handleCalendarClick = () => {
    try {
      if (dateInputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        dateInputRef.current.showPicker()
      } else {
        dateInputRef.current?.focus()
      }
    } catch (e) {
      dateInputRef.current?.focus()
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val) {
      router.push(`/solar/${plantCode}?mode=${mode}&date=${val}`)
    }
  }

  // Get current year/month parts to set up default buttons linking
  const parts = dateValue.split('-')
  const y = parts[0]
  const m = parts[1] || '01'
  const d = parts[2] || '01'

  const toDayLink = `/solar/${plantCode}?mode=day&date=${y}-${m}-${d}`
  const toMonthLink = `/solar/${plantCode}?mode=month&date=${y}-${m}`
  const toYearLink = `/solar/${plantCode}?mode=year&date=${y}`

  return (
    <div className="flex items-center gap-4 bg-cream-50 p-1.5 rounded-lg border border-cream-200">
      <div className="hidden sm:flex items-center border-r border-cream-200 pr-2 mr-2">
        <Link 
          href={toDayLink}
          className={`px-3 py-1.5 text-sm font-medium border rounded-l transition-colors ${mode === 'day' ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-cream-600 border-cream-200 hover:text-cream-900'}`}
        >
          Dia
        </Link>
        <Link 
          href={toMonthLink}
          className={`px-3 py-1.5 text-sm font-medium border-y border-r transition-colors ${mode === 'month' ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-cream-600 border-cream-200 hover:text-cream-900 border-l-0'}`}
        >
          Mês
        </Link>
        <Link 
          href={toYearLink}
          className={`px-3 py-1.5 text-sm font-medium border-y border-r rounded-r transition-colors ${mode === 'year' ? 'bg-sky-500 text-white border-sky-500 shadow-sm' : 'bg-white text-cream-600 border-cream-200 hover:text-cream-900 border-l-0'}`}
        >
          Ano
        </Link>
      </div>

      <div className="flex items-center gap-1 relative">
        <Link
          href={`/solar/${plantCode}?mode=${mode}&date=${prevDate}`}
          className="p-1.5 text-cream-400 hover:text-cream-700 hover:bg-cream-100 rounded"
        >
          &lt;
        </Link>
        
        <div 
          className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-cream-900 min-w-[120px] justify-center bg-white border border-cream-200 rounded cursor-pointer relative"
          onClick={handleCalendarClick}
        >
          {dateValue}
          <Calendar className="w-4 h-4 text-cream-400" />
          
          {/* Hidden native input */}
          <input
            ref={dateInputRef}
            type={mode === 'day' ? 'date' : mode === 'month' ? 'month' : 'number'}
            min={mode === 'year' ? '2000' : undefined}
            max={mode === 'year' ? '2100' : undefined}
            value={dateValue}
            onChange={handleDateChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            style={{ display: 'block' }}
          />
        </div>

        <Link
          href={`/solar/${plantCode}?mode=${mode}&date=${nextDate}`}
          className={`p-1.5 rounded ${isLatest ? 'text-cream-300 pointer-events-none' : 'text-cream-400 hover:text-cream-700 hover:bg-cream-100'}`}
        >
          &gt;
        </Link>
      </div>
    </div>
  )
}
