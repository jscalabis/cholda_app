import { Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoiceTableClient } from '@/components/financeiro/InvoiceTableClient'
import type { InvoiceRow } from '@/components/financeiro/InvoiceTableClient'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const [invoicesRes, locationsRes] = await Promise.all([
    supabase
      .from('grid_invoices')
      .select('*')
      .order('period_start', { ascending: false }),
    supabase.from('locations').select('id, name'),
  ])

  const locationMap = new Map(
    (locationsRes.data ?? []).map((l: { id: string; name: string }) => [l.id, l.name])
  )

  const invoices: InvoiceRow[] = (invoicesRes.data ?? []).map((inv) => ({
    ...inv,
    location_name: locationMap.get(inv.location_id) ?? 'Desconhecido',
  }))

  const locationNames = [
    ...new Set(invoices.map((i) => i.location_name).filter(Boolean)),
  ].sort()

  const totalKwh = invoices.reduce((s, i) => s + i.kwh_consumed, 0)
  const totalEur = invoices.reduce((s, i) => s + i.total_cost_eur, 0)

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-100">
          <Receipt className="h-5 w-5 text-forest-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cream-900">Financeiro</h1>
          <p className="text-xs text-cream-500 mt-0.5">Faturas submetidas</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total de Faturas</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total kWh Faturados</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">
            {totalKwh >= 1000
              ? `${(totalKwh / 1000).toFixed(1)} MWh`
              : `${totalKwh.toFixed(0)} kWh`}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Total Faturado (€)</p>
          <p className="text-2xl font-bold text-forest-700 mt-2">
            {totalEur.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      <InvoiceTableClient invoices={invoices} locationNames={locationNames} />
    </div>
  )
}
