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

export interface WaterMmDataPoint {
  name: string
  mm: number
}

interface Props {
  data: WaterMmDataPoint[]
}

export function WaterMmChart({ data }: Props) {
  if (!data.length || data.every((d) => d.mm === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-cream-400 text-sm">
        Sem dados de rega para o período selecionado
      </div>
    )
  }

  const nonZeroBars = data.filter((d) => d.mm > 0).length

  const getColor = (index: number) => {
    if (nonZeroBars <= 1) return '#1a4d6b'
    const factor = Math.min(index, nonZeroBars - 1) / (nonZeroBars - 1)
    const r = Math.round(20  + factor * (80  - 20))
    const g = Math.round(90  + factor * (170 - 90))
    const b = Math.round(140 + factor * (220 - 140))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#80766a' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#80766a' }} unit=" mm" width={60} />
        <Tooltip
          formatter={(value) => [
            typeof value === 'number' ? `${value.toFixed(1)} mm` : String(value),
            'Água aplicada',
          ]}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: '1px solid #e8e4db',
            background: '#faf9f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="mm" radius={[4, 4, 0, 0]} maxBarSize={60}>
          {data.map((d, idx) => (
            <Cell
              key={idx}
              fill={d.mm === 0 ? '#e0dbd3' : getColor(idx)}
              opacity={d.mm === 0 ? 0.5 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
