'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  ChevronDown,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface InvoiceRow {
  id: string
  location_id: string
  location_name: string
  period_start: string
  period_end: string
  kwh_consumed: number
  total_cost_eur: number
  notes: string | null
  created_at: string
  updated_at: string
}

interface Props {
  invoices: InvoiceRow[]
  locationNames: string[]
}

type SortKey = 'location_name' | 'created_at' | 'period_start' | 'period_end' | 'kwh_consumed' | 'total_cost_eur'
type SortDir = 'asc' | 'desc'

function fmtDate(iso: string): string {
  return new Date(iso.includes('T') ? iso : iso + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtKwh(kwh: number): string {
  return `${kwh.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} kWh`
}

function fmtEur(eur: number): string {
  return eur.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

interface InvoiceFormData {
  period_start: string
  period_end: string
  kwh_consumed: string
  total_cost_eur: string
  notes: string
}

export function InvoiceTableClient({ invoices, locationNames }: Props) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('period_start')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedNames, setSelectedNames] = useState<string[]>([]) // empty = all
  const [filterOpen, setFilterOpen] = useState(false)
  const [detail, setDetail] = useState<InvoiceRow | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<InvoiceFormData>({
    period_start: '',
    period_end: '',
    kwh_consumed: '',
    total_cost_eur: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-forest-600" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-forest-600" />
    )
  }

  const filtered = useMemo(() => {
    let rows = invoices
    if (selectedNames.length > 0) {
      rows = rows.filter((r) => selectedNames.includes(r.location_name))
    }
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'pt-PT')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [invoices, selectedNames, sortKey, sortDir])

  function openDetail(row: InvoiceRow) {
    setDetail(row)
    setEditing(false)
  }

  function startEdit() {
    if (!detail) return
    setForm({
      period_start: detail.period_start,
      period_end: detail.period_end,
      kwh_consumed: String(detail.kwh_consumed),
      total_cost_eur: String(detail.total_cost_eur),
      notes: detail.notes ?? '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('grid_invoices')
      .update({
        period_start: form.period_start,
        period_end: form.period_end,
        kwh_consumed: parseFloat(form.kwh_consumed),
        total_cost_eur: parseFloat(form.total_cost_eur),
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', detail.id)
    setSaving(false)
    setDetail(null)
    setEditing(false)
    router.refresh()
  }

  function setField(k: keyof InvoiceFormData, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const thClass =
    'px-5 py-3 text-left text-xs font-semibold text-cream-500 uppercase tracking-wide select-none'
  const thBtn =
    'flex items-center gap-0.5 hover:text-cream-800 transition-colors cursor-pointer'

  return (
    <>
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="px-5 py-4 border-b border-cream-100 flex items-center justify-between gap-4">
          <p className="text-sm text-cream-600">
            {filtered.length} fatura{filtered.length !== 1 ? 's' : ''}
            {selectedNames.length > 0 && (
              <span className="ml-2 text-xs text-cream-400">
                — {selectedNames.join(', ')}
              </span>
            )}
          </p>
          {/* Location filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cream-200 bg-cream-50 text-sm text-cream-700 hover:bg-cream-100 transition-colors"
            >
              <span>
                {selectedNames.length === 0
                  ? 'Todas as localizações'
                  : selectedNames.length === 1
                  ? selectedNames[0]
                  : `${selectedNames.length} selecionadas`}
              </span>
              <ChevronDown className="h-4 w-4 text-cream-400" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-cream-200 rounded-xl shadow-lg min-w-48 py-1.5">
                <button
                  onClick={() => {
                    setSelectedNames([])
                    setFilterOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-cream-50 transition-colors',
                    selectedNames.length === 0 ? 'font-medium text-forest-700' : 'text-cream-700'
                  )}
                >
                  {selectedNames.length === 0 && <Check className="h-3.5 w-3.5 text-forest-600" />}
                  {selectedNames.length !== 0 && <span className="w-3.5" />}
                  Todas
                </button>
                <div className="border-t border-cream-100 my-1" />
                {locationNames.map((name) => {
                  const active = selectedNames.includes(name)
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setSelectedNames((prev) =>
                          active ? prev.filter((n) => n !== name) : [...prev, name]
                        )
                      }}
                      className={cn(
                        'flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-cream-50 transition-colors',
                        active ? 'font-medium text-forest-700' : 'text-cream-700'
                      )}
                    >
                      {active ? (
                        <Check className="h-3.5 w-3.5 text-forest-600" />
                      ) : (
                        <span className="w-3.5" />
                      )}
                      {name}
                    </button>
                  )
                })}
                {selectedNames.length > 0 && (
                  <>
                    <div className="border-t border-cream-100 my-1" />
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-xs text-cream-400 hover:text-cream-700 transition-colors"
                    >
                      Fechar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50 border-b border-cream-100">
                <th className={thClass}>
                  <button className={thBtn} onClick={() => toggleSort('location_name')}>
                    Nome <SortIcon col="location_name" />
                  </button>
                </th>
                <th className={thClass}>
                  <button className={thBtn} onClick={() => toggleSort('created_at')}>
                    Data Fatura <SortIcon col="created_at" />
                  </button>
                </th>
                <th className={thClass}>
                  <button className={thBtn} onClick={() => toggleSort('period_start')}>
                    Início Período <SortIcon col="period_start" />
                  </button>
                </th>
                <th className={thClass}>
                  <button className={thBtn} onClick={() => toggleSort('period_end')}>
                    Fim Período <SortIcon col="period_end" />
                  </button>
                </th>
                <th className={thClass}>
                  <button className={cn(thBtn, 'justify-end w-full')} onClick={() => toggleSort('kwh_consumed')}>
                    Total kWh <SortIcon col="kwh_consumed" />
                  </button>
                </th>
                <th className={thClass}>
                  <button className={cn(thBtn, 'justify-end w-full')} onClick={() => toggleSort('total_cost_eur')}>
                    Total € <SortIcon col="total_cost_eur" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-cream-400 text-sm">
                    Nenhuma fatura encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openDetail(row)}
                    className="hover:bg-cream-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-cream-900">{row.location_name}</td>
                    <td className="px-5 py-4 text-cream-600">{fmtDate(row.created_at)}</td>
                    <td className="px-5 py-4 text-cream-600">{fmtDate(row.period_start)}</td>
                    <td className="px-5 py-4 text-cream-600">{fmtDate(row.period_end)}</td>
                    <td className="px-5 py-4 text-right font-medium text-cream-800">
                      {fmtKwh(row.kwh_consumed)}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-forest-700">
                      {fmtEur(row.total_cost_eur)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / Edit Modal */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDetail(null)
              setEditing(false)
            }
          }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-cream-200">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-cream-100">
              <div>
                <h2 className="font-semibold text-cream-900">
                  {editing ? 'Editar Fatura' : 'Detalhe da Fatura'}
                </h2>
                <p className="text-xs text-cream-500 mt-0.5">{detail.location_name}</p>
              </div>
              <button
                onClick={() => {
                  setDetail(null)
                  setEditing(false)
                }}
                className="p-1.5 rounded-lg text-cream-400 hover:text-cream-700 hover:bg-cream-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream-600 font-semibold uppercase tracking-wide">
                        Início do Período
                      </Label>
                      <Input
                        type="date"
                        value={form.period_start}
                        onChange={(e) => setField('period_start', e.target.value)}
                        className="border-cream-300 focus:ring-forest-400 text-cream-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream-600 font-semibold uppercase tracking-wide">
                        Fim do Período
                      </Label>
                      <Input
                        type="date"
                        value={form.period_end}
                        onChange={(e) => setField('period_end', e.target.value)}
                        className="border-cream-300 focus:ring-forest-400 text-cream-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream-600 font-semibold uppercase tracking-wide">
                        kWh Consumidos
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.kwh_consumed}
                        onChange={(e) => setField('kwh_consumed', e.target.value)}
                        className="border-cream-300 focus:ring-forest-400 text-cream-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-cream-600 font-semibold uppercase tracking-wide">
                        Total (€)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.total_cost_eur}
                        onChange={(e) => setField('total_cost_eur', e.target.value)}
                        className="border-cream-300 focus:ring-forest-400 text-cream-800"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-cream-600 font-semibold uppercase tracking-wide">
                      Notas
                    </Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setField('notes', e.target.value)}
                      placeholder="Observações..."
                      className="border-cream-300 focus:ring-forest-400 text-cream-800"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Data da Fatura', value: fmtDate(detail.created_at) },
                    { label: 'Início do Período', value: fmtDate(detail.period_start) },
                    { label: 'Fim do Período', value: fmtDate(detail.period_end) },
                    { label: 'Total kWh', value: fmtKwh(detail.kwh_consumed) },
                    { label: 'Total €', value: fmtEur(detail.total_cost_eur) },
                    { label: 'Notas', value: detail.notes ?? '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-1">
                      <p className="text-xs text-cream-500 uppercase tracking-wide font-semibold">
                        {label}
                      </p>
                      <p className="text-sm font-medium text-cream-900">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-cream-100">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(false)}
                    className="border-cream-300 text-cream-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving || !form.period_start || !form.kwh_consumed || !form.total_cost_eur}
                    className="bg-forest-700 hover:bg-forest-600 text-white"
                  >
                    {saving ? 'A guardar...' : 'Guardar'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={startEdit}
                  className="bg-forest-700 hover:bg-forest-600 text-white"
                >
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
