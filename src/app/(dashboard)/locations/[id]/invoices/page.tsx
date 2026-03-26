import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InvoiceList } from '@/components/settings/InvoiceList'
import type { GridInvoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InvoicesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: location } = await supabase
    .from('locations')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!location) notFound()

  const { data: invoices } = await supabase
    .from('grid_invoices')
    .select('*')
    .eq('location_id', id)
    .order('period_start', { ascending: false })

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/locations/${id}`} className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Faturas — {location.name}</h1>
          <p className="text-sm text-slate-500">Registo mensal de consumo e custo</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Faturas registadas</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceList locationId={id} invoices={(invoices ?? []) as GridInvoice[]} />
        </CardContent>
      </Card>
    </div>
  )
}
