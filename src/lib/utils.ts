import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatKwh(value: number, decimals = 1): string {
  if (value >= 1000) return `${(value / 1000).toFixed(decimals)} MWh`
  return `${value.toFixed(decimals)} kWh`
}

export function formatEur(value: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/** Returns 'YYYY-MM' string for a given Date */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Returns first and last day of a given 'YYYY-MM' month */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  const [year, month] = monthKey.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return { start, end }
}
