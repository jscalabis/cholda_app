'use client'

import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { fmtNum } from '@/lib/utils'

export interface HourlyDataPoint {
  label: string
  kwh: number | null
  avgKwh?: number | null
}

interface Props {
  data: HourlyDataPoint[]
  labelFormatterPrefix?: string
  chartType?: 'line' | 'bar'
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 10,
  border: '1px solid #e8e4db',
  background: '#faf9f6',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export function ProductionChart({ data, labelFormatterPrefix = 'Hora', chartType = 'line' }: Props) {
  if (!data.length || data.every((d) => !d.kwh)) {
    return (
      <div className="flex h-64 items-center justify-center text-cream-400 text-sm">
        Sem dados de produção para o período selecionado
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter = (value: any, name: any): [string, string] => [
    typeof value === 'number' ? `${fmtNum(value, 1)} kWh` : String(value),
    name === 'avgKwh' ? 'Méd. histórica' : 'Produção',
  ]
  const labelFormatter = (label: unknown) => `${labelFormatterPrefix}: ${label}`

  if (chartType === 'bar') {
    const nonNullCount = data.filter((d) => d.kwh !== null).length

    const getGradientColor = (nonNullIndex: number) => {
      if (nonNullCount <= 1) return '#2d4a2d'
      const factor = nonNullIndex / (nonNullCount - 1)
      const r = Math.round(26 + factor * (148 - 26))
      const g = Math.round(51 + factor * (202 - 51))
      const b = Math.round(26 + factor * (148 - 26))
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    let nonNullIndex = 0
    const hasAvg = data.some((d) => d.avgKwh != null)

    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 20 }}
          barGap="-100%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#80766a' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: '#80766a' }} unit=" kWh" width={70} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} contentStyle={tooltipStyle} />
          <Bar dataKey="kwh" radius={[3, 3, 0, 0]} maxBarSize={40}>
            {data.map((d, idx) => {
              const fill = d.kwh !== null ? getGradientColor(nonNullIndex) : '#e0dbd3'
              if (d.kwh !== null) nonNullIndex++
              return <Cell key={idx} fill={fill} opacity={d.kwh === null ? 0 : 1} />
            })}
          </Bar>
          {hasAvg && (
            <Bar
              dataKey="avgKwh"
              isAnimationActive={false}
              shape={(props: any) => {
                const { x, y, width, payload } = props
                if (y === undefined || y === null || !payload || payload.avgKwh === null) return <path d="" />
                
                // Calculate center and width precisely
                const centerX = x + width / 2
                const barWidth = Math.min(width, 40) // Match maxBarSize={40} of the primary bar
                const targetWidth = barWidth * 0.8
                
                return (
                  <line
                    x1={centerX - targetWidth / 2}
                    x2={centerX + targetWidth / 2}
                    y1={y}
                    y2={y}
                    stroke="#d97706"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                )
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4db" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#80766a' }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 11, fill: '#80766a' }} unit=" kWh" width={70} />
        <Tooltip formatter={tooltipFormatter} labelFormatter={labelFormatter} contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="kwh"
          stroke="#3d6b3d"
          strokeWidth={3}
          dot={{ r: 3, fill: '#3d6b3d', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#2d4a2d', strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
