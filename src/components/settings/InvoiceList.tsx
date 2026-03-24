'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatKwh, formatEur } from '@/lib/utils'
import type { GridInvoice } from '@/lib/types'

interface Props {
  locationId: string
  invoices: GridInvoice[]
}

interface InvoiceFormData {
  period_start: string
  period_end: string
  kwh_consumed: string
  total_cost_eur: string
  notes: string
}

const emptyForm: InvoiceFormData = {
  period_start: '',
  period_end: '',
  kwh_consumed: '',
  total_cost_eur: '',
  notes: '',
}

export function InvoiceList({ locationId, invoices }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GridInvoice | null>(null)
  const [form, setForm] = useState<InvoiceFormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(invoice: GridInvoice) {
    setEditing(invoice)
    setForm({
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      kwh_consumed: String(invoice.kwh_consumed),
      total_cost_eur: String(invoice.total_cost_eur),
      notes: invoice.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const payload = {
      location_id: locationId,
      period_start: form.period_start,
      period_end: form.period_end,
      kwh_consumed: parseFloat(form.kwh_consumed),
      total_cost_eur: parseFloat(form.total_cost_eur),
      notes: form.notes || null,
      updated_at: new Date().toISOString(),
    }

    if (editing) {
      await supabase.from('grid_invoices').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('grid_invoices').insert(payload)
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('grid_invoices').delete().eq('id', id)
    router.refresh()
  }

  function setField(key: keyof InvoiceFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar fatura
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Nenhuma fatura registada.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-slate-500 font-medium">Período</th>
              <th className="text-right py-2 text-slate-500 font-medium">kWh</th>
              <th className="text-right py-2 text-slate-500 font-medium">Custo</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-50">
                <td className="py-2 text-slate-900">
                  {new Date(inv.period_start + 'T00:00:00').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </td>
                <td className="py-2 text-right text-slate-700">{formatKwh(inv.kwh_consumed)}</td>
                <td className="py-2 text-right text-slate-700">{formatEur(inv.total_cost_eur)}</td>
                <td className="py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(inv)} className="text-slate-400 hover:text-slate-700 p-1">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(inv.id)} className="text-slate-400 hover:text-red-500 p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Invoice form dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar fatura' : 'Nova fatura'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início do período</Label>
                <Input
                  type="date"
                  value={form.period_start}
                  onChange={(e) => setField('period_start', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fim do período</Label>
                <Input
                  type="date"
                  value={form.period_end}
                  onChange={(e) => setField('period_end', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>kWh consumidos</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ex: 1234.5"
                  value={form.kwh_consumed}
                  onChange={(e) => setField('kwh_consumed', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Custo total (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ex: 250.00"
                  value={form.total_cost_eur}
                  onChange={(e) => setField('total_cost_eur', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Input
                placeholder="Observações"
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={loading || !form.period_start || !form.kwh_consumed || !form.total_cost_eur}
              >
                {loading ? 'A guardar...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
