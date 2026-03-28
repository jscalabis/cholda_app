'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { fmtNum } from '@/lib/utils'

export interface HourlyDataPoint {
  label: string
  kwh: number
}

interface Props {
  data: HourlyDataPoint[]
}

export function HourlyProductionChart({ data }: Props) {
  if (!data.length || data.every((d) => d.kwh === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-cream-400 text-sm">
        Sem dados de produção para o dia selecionado
      </div>
    )
  }

  // Count active bars to properly distribute the gradient
  const nonZeroBars = data.filter((d) => d.kwh > 0).length

  const getGradientColor = (index: number) => {
    if (nonZeroBars <= 1) return '#2d4a2d'
    const factor = Math.min(index, nonZeroBars - 1) / (nonZeroBars - 1)
    const r = Math.round(26 + factor * (148 - 26))
    const g = Math.round(51 + factor * (202 - 51))
    const b = Math.round(26 + factor * (148 - 26))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#80766a' }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11, fill: '#80766a' }} unit=" kWh" width={70} />
        <Tooltip
          formatter={(value: any) => [
            typeof value === 'number' ? `${fmtNum(value, 1)} kWh` : String(value),
            'Produção',
          ] as [string, string]}
          labelFormatter={(label) => `Hora: ${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: '1px solid #e8e4db',
            background: '#faf9f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="kwh" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((d, idx) => (
            <Cell 
              key={idx} 
              fill={d.kwh === 0 ? '#e0dbd3' : getGradientColor(idx)} 
              opacity={d.kwh === 0 ? 0.5 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
