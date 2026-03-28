import { Receipt } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { InvoicesTable } from '@/components/financeiro/InvoicesTable'
import type { UnifiedInvoice } from '@/components/financeiro/InvoicesTable'
import { InvoiceForm } from '@/components/financeiro/InvoiceForm'
import { fmtNum, formatEur as libFormatEur } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function FinanceiroPage() {
  const supabase = await createClient()

  const [invoicesRes, locationsRes, tarifaPlantsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('*')
      .order('period_start', { ascending: false }),
    supabase.from('locations').select('id, name'),
    supabase.from('solar_park_details').select('plant_code, park_name').eq('production_mode', 'Tarifa').order('park_name')
  ])

  const tarifaPlants = tarifaPlantsRes.data ?? []
  const locations = locationsRes.data ?? []

  const locationMap = new Map(
    locations.map((l: { id: string; name: string }) => [l.id, l.name])
  )
  
  const plantMap = new Map(
    tarifaPlants.map((p: { plant_code: string; park_name: string }) => [p.plant_code, p.park_name || p.plant_code])
  )

  const invoices: UnifiedInvoice[] = (invoicesRes.data ?? []).map((inv: any) => ({
    ...inv,
    entity_id: inv.invoice_type === 'production' ? inv.plant_code : inv.location_id,
    entity_name: inv.invoice_type === 'production' 
      ? (plantMap.get(inv.plant_code) || inv.plant_code || 'Desconhecido')
      : (locationMap.get(inv.location_id) || 'Desconhecido'),
  }))

  const productionInvoices = invoices.filter(i => i.invoice_type === 'production')
  const consumptionInvoices = invoices.filter(i => i.invoice_type === 'consumption')

  const productionKwh = productionInvoices.reduce((s, i) => s + (i.kwh_value || 0), 0)
  const productionEur = productionInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  const consumptionKwh = consumptionInvoices.reduce((s, i) => s + (i.kwh_value || 0), 0)
  const consumptionEur = consumptionInvoices.reduce((s, i) => s + (i.total_amount || 0), 0)
  
  const unaccountedInvoices = invoices.filter(i => !i.document_number || i.document_number.trim() === '').length

  function formatKwh(kwh: number) {
    return `${fmtNum(kwh, 0)} kWh`
  }

  function formatEur(eur: number) {
    return libFormatEur(eur)
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-forest-100">
          <Receipt className="h-5 w-5 text-forest-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-cream-900">Financeiro</h1>
          <p className="text-xs text-cream-500 mt-0.5">Gestão e submissão de faturas</p>
        </div>
        
        <div className="ml-auto">
          <InvoiceForm tarifaPlants={tarifaPlants} locations={locations} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Consumo */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Consumo</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-forest-700">{formatKwh(consumptionKwh)}</p>
            <p className="text-sm font-medium text-cream-600 mt-1">{formatEur(consumptionEur)}</p>
          </div>
        </div>
        {/* Card 2: Produção */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Produção</p>
          <div className="mt-2">
            <p className="text-2xl font-bold text-forest-700">{formatKwh(productionKwh)}</p>
            <p className="text-sm font-medium text-cream-600 mt-1">{formatEur(productionEur)}</p>
          </div>
        </div>
        {/* Card 3: Por Contabilizar */}
        <div className="bg-white rounded-xl border border-cream-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">Faturas por Contabilizar</p>
            <p className="text-xs text-cream-400 mt-0.5">Sem nº de documento</p>
          </div>
          <div className="mt-2">
            <p className={`text-2xl font-bold ${unaccountedInvoices > 0 ? 'text-amber-600' : 'text-forest-700'}`}>
              {unaccountedInvoices} faturas
            </p>
          </div>
        </div>
      </div>

      <InvoicesTable 
        invoices={productionInvoices} 
        title="Faturas de Produção (Venda)" 
        entityType="Parque" 
        tarifaPlants={tarifaPlants} 
        locations={locations} 
      />
      <InvoicesTable 
        invoices={consumptionInvoices} 
        title="Faturas de Consumo (Compra)" 
        entityType="Contador" 
        tarifaPlants={tarifaPlants} 
        locations={locations} 
      />
    </div>
  )
}
