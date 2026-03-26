'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface DayBucket {
  date: string
  production_kwh: number
  consumption_kwh: number
  self_consumed_kwh: number
}

interface Props {
  data: DayBucket[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export function EnergyBarChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-sm">
        Sem dados para o período selecionado
      </div>
    )
  }

  const formatted = data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          unit=" kWh"
          width={70}
        />
        <Tooltip
          formatter={(value: any, name: any) => [
            typeof value === 'number' ? `${value.toFixed(1)} kWh` : String(value),
            String(name) === 'production_kwh' ? 'Produção'
              : String(name) === 'consumption_kwh' ? 'Consumo'
              : 'Autoconsumo',
          ] as [string, string]}
          labelFormatter={(label) => `Dia: ${label}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend
          formatter={(value) =>
            value === 'production_kwh' ? 'Produção'
              : value === 'consumption_kwh' ? 'Consumo'
              : 'Autoconsumo'
          }
          wrapperStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="production_kwh" fill="#22c55e" radius={[3, 3, 0, 0]} name="production_kwh">
          {formatted.map((d, index) => {
            const factor = formatted.length > 1 ? index / (formatted.length - 1) : 0
            const r = Math.round(21 + factor * (134 - 21))
            const g = Math.round(128 + factor * (239 - 128))
            const b = Math.round(61 + factor * (172 - 61))
            const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            return <Cell key={`prod-${index}`} fill={d.production_kwh === 0 ? '#e2e8f0' : fill} opacity={d.production_kwh === 0 ? 0.5 : 1} />
          })}
        </Bar>
        <Bar dataKey="consumption_kwh" fill="#3b82f6" radius={[3, 3, 0, 0]} name="consumption_kwh">
          {formatted.map((d, index) => {
            const factor = formatted.length > 1 ? index / (formatted.length - 1) : 0
            const r = Math.round(29 + factor * (147 - 29))
            const g = Math.round(78 + factor * (197 - 78))
            const b = Math.round(216 + factor * (253 - 216))
            const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            return <Cell key={`cons-${index}`} fill={d.consumption_kwh === 0 ? '#e2e8f0' : fill} opacity={d.consumption_kwh === 0 ? 0.5 : 1} />
          })}
        </Bar>
        <Bar dataKey="self_consumed_kwh" fill="#f59e0b" radius={[3, 3, 0, 0]} name="self_consumed_kwh">
          {formatted.map((d, index) => {
            const factor = formatted.length > 1 ? index / (formatted.length - 1) : 0
            const r = Math.round(180 + factor * (252 - 180))
            const g = Math.round(83 + factor * (211 - 83))
            const b = Math.round(9 + factor * (77 - 9))
            const fill = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
            return <Cell key={`self-${index}`} fill={d.self_consumed_kwh === 0 ? '#e2e8f0' : fill} opacity={d.self_consumed_kwh === 0 ? 0.5 : 1} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
