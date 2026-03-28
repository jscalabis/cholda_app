'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmtNum } from '@/lib/utils'
import type { DeviceBreakdown } from '@/lib/types'

const COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
]

interface Props {
  data: DeviceBreakdown[]
}

export function DonutBreakdown({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center text-slate-400 text-sm">
        Sem dados
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          dataKey="total_kwh"
          nameKey="display_name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            typeof value === 'number' ? `${fmtNum(value, 1)} kWh` : String(value),
            String(name),
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          formatter={(value, entry) => {
            const item = data.find((d) => d.display_name === value)
            return `${value} (${fmtNum(item?.percentage ?? 0, 0)}%)`
          }}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
