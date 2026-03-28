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
  ReferenceLine,
} from 'recharts'
import { fmtNum } from '@/lib/utils'

export interface YieldDataPoint {
  name: string
  yield: number // kWh/kWp
  production: number // kWh
  capacity: number // kWp
}

interface Props {
  data: YieldDataPoint[]
}

const BAR_COLORS = [
  '#2d4a2d', '#3d6b3d', '#4d8a4d', '#5a9a5a', '#6aa86a',
  '#7ab87a', '#8ec48e', '#243824', '#345634', '#447844',
]

export function SpecificYieldChart({ data }: Props) {
  if (!data.length || data.every((d) => d.yield === 0)) {
    return (
      <div className="flex h-72 items-center justify-center text-cream-400 text-sm">
        Sem dados de produção para a data selecionada
      </div>
    )
  }

  // Compute the total number of non-zero bars to calculate the gradient correctly
  const nonZeroBars = data.filter((d) => d.yield > 0).length

  // Generate a color from dark green (#1a331a) to light green (#94ca94)
  const getGradientColor = (index: number) => {
    if (nonZeroBars <= 1) return '#2d4a2d'
    // Cap index to nonZeroBars - 1 to properly span the gradient
    const factor = Math.min(index, nonZeroBars - 1) / (nonZeroBars - 1)
    
    // Start: R=26, G=51, B=26  (#1a331a)
    // End:   R=148, G=202, B=148 (#94ca94)
    const r = Math.round(26 + factor * (148 - 26))
    const g = Math.round(51 + factor * (202 - 51))
    const b = Math.round(26 + factor * (148 - 26))

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10, fill: '#80766a' }}
          angle={-45}
          textAnchor="end"
          interval={0}
          height={80}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#80766a' }}
          unit=" kWh/kWp"
          width={90}
        />
        {/* Constant reference line at y=1 (fleet average benchmark) */}
        <ReferenceLine
          y={1}
          stroke="#b08c3a"
          strokeDasharray="6 4"
          strokeWidth={1.5}
          label={{
            value: 'Média: 1',
            position: 'right',
            fontSize: 10,
            fill: '#b08c3a',
          }}
        />
        <Tooltip
          formatter={(value: any, _name: any, props: any) => {
            const d = props.payload as YieldDataPoint
            const numValue = typeof value === 'number' ? value : 0
            return [
              `${fmtNum(numValue, 2)} kWh/kWp`,
              `Produção: ${fmtNum(d.production, 1)} kWh  |  Capacidade: ${fmtNum(d.capacity, 1)} kWp`,
            ] as [string, string]
          }}
          labelFormatter={(label) => `${label}`}
          contentStyle={{
            fontSize: 12,
            borderRadius: 10,
            border: '1px solid #e8e4db',
            background: '#faf9f6',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="yield" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((d, idx) => (
            <Cell
              key={idx}
              fill={d.yield === 0 ? '#e0dbd3' : getGradientColor(idx)}
              opacity={d.yield === 0 ? 0.5 : 1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
