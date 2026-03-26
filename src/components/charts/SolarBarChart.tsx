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

export interface SolarDataPoint {
  name: string
  kwh: number
}

interface Props {
  data: SolarDataPoint[]
}

const BAR_COLORS = ['#2d4a2d', '#3d6b3d', '#4d8a4d', '#6aa86a', '#8ec48e', '#243824']

export function SolarBarChart({ data }: Props) {
  if (!data.length || data.every((d) => d.kwh === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-cream-400 text-sm">
        Sem dados de produção para o período selecionado
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
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 64 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#80766a' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11, fill: '#80766a' }} unit=" kWh" width={75} />
        <Tooltip
          formatter={(value) => [
            typeof value === 'number' ? `${value.toFixed(1)} kWh` : String(value),
            'Produção',
          ]}
          labelFormatter={(label) => `${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: '1px solid #e8e4db',
            background: '#faf9f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="kwh" radius={[4, 4, 0, 0]} maxBarSize={60}>
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
