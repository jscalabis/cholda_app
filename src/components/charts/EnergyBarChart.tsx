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
          formatter={(value, name) => [
            typeof value === 'number' ? `${value.toFixed(1)} kWh` : String(value),
            String(name) === 'production_kwh' ? 'Produção'
              : String(name) === 'consumption_kwh' ? 'Consumo'
              : 'Autoconsumo',
          ]}
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
        <Bar dataKey="production_kwh" fill="#22c55e" radius={[3, 3, 0, 0]} name="production_kwh" />
        <Bar dataKey="consumption_kwh" fill="#3b82f6" radius={[3, 3, 0, 0]} name="consumption_kwh" />
        <Bar dataKey="self_consumed_kwh" fill="#f59e0b" radius={[3, 3, 0, 0]} name="self_consumed_kwh" />
      </BarChart>
    </ResponsiveContainer>
  )
}
