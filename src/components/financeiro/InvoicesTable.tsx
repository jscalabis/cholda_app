'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { InvoiceForm } from './InvoiceForm'
import { fmtNum, formatEur as libFormatEur } from '@/lib/utils'

export interface UnifiedInvoice {
  id: string
  invoice_type: 'production' | 'consumption'
  entity_id: string
  entity_name: string
  period_start: string
  period_end: string
  invoice_date: string
  document_number: string | null
  kwh_value: number
  total_amount: number
  notes: string | null
  created_at: string
}

interface Props {
  invoices: UnifiedInvoice[]
  title: string
  entityType: 'Parque' | 'Contador'
  tarifaPlants: { plant_code: string; park_name: string }[]
  locations: { id: string; name: string }[]
}

type SortKey = 'entity_name' | 'period_start' | 'period_end' | 'invoice_date' | 'kwh_value' | 'total_amount' | 'document_number'
type SortDir = 'asc' | 'desc'

function fmtDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso.includes('T') ? iso : iso + 'T00:00:00').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtKwh(kwh: number): string {
  return `${fmtNum(kwh || 0, 1)} kWh`
}

function fmtEur(eur: number): string {
  return libFormatEur(eur || 0)
}

export function InvoicesTable({ invoices, title, entityType, tarifaPlants, locations }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('invoice_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [editingInvoice, setEditingInvoice] = useState<UnifiedInvoice | null>(null)
  
  // Pagination State
  const [pageSize, setPageSize] = useState(15)
  const [currentPage, setCurrentPage] = useState(1)
  
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const availableNames = useMemo(() => Array.from(new Set(invoices.map(i => i.entity_name))).sort(), [invoices])
  
  const router = useRouter()
  const supabase = createClient()

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40 inline-block" />
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 ml-1 text-forest-600 inline-block" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1 text-forest-600 inline-block" />
    )
  }

  async function handleDelete(inv: UnifiedInvoice) {
    if (!window.confirm("Pretende apagar esta fatura? Esta ação é irreversível.")) {
      return
    }

    const { error } = await supabase.from('invoices').delete().eq('id', inv.id)
    if (!error) {
      router.refresh()
    } else {
      alert('Erro ao apagar fatura: ' + error.message)
    }
  }

  const sorted = useMemo(() => {
    let filtered = invoices
    if (selectedNames.length > 0) {
      filtered = filtered.filter(inv => selectedNames.includes(inv.entity_name))
    }

    return [...filtered].sort((a, b) => {
      let cmp = 0
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal)
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else if (aVal === null) {
        cmp = 1
      } else if (bVal === null) {
        cmp = -1
      }

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [invoices, sortKey, sortDir, selectedNames])

  // Pagination Logic
  const totalItems = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedItems = useMemo(() => {
    return sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [sorted, currentPage, pageSize])

  // Reset to first page when filters or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedNames, pageSize, sortKey, sortDir])

  return (
    <>
      <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-cream-100 flex items-center justify-between bg-cream-50">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-cream-900 uppercase tracking-wide">{title}</h2>
            <span className="text-xs font-semibold text-forest-700 bg-forest-100 px-2 py-1 rounded-full">{sorted.length} faturas</span>
          </div>

          {availableNames.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-cream-700 bg-white border border-cream-200 rounded-lg hover:bg-cream-50 transition-colors"
                title={`Filtrar ${entityType}s`}
              >
                <Filter className="w-4 h-4 text-cream-500" />
                <span className="hidden sm:inline">Filtrar</span> {selectedNames.length > 0 && `(${selectedNames.length})`}
              </button>
              
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-cream-200 rounded-xl shadow-xl z-20 py-2 max-h-[50vh] overflow-y-auto">
                  <div className="px-3 py-2 border-b border-cream-100 cursor-pointer hover:bg-cream-50 flex items-center gap-2"
                       onClick={() => setSelectedNames([])}>
                    <input type="checkbox" checked={selectedNames.length === 0} readOnly className="rounded text-forest-600 focus:ring-forest-500 border-cream-300 pointer-events-none" />
                    <span className="text-sm text-cream-900 font-medium">Todos</span>
                  </div>
                  {availableNames.map(name => (
                    <label key={name} className="flex items-center gap-2 px-3 py-2 hover:bg-cream-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedNames.includes(name)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedNames([...selectedNames, name])
                          else setSelectedNames(selectedNames.filter(n => n !== name))
                        }}
                        className="rounded text-forest-600 focus:ring-forest-500 border-cream-300"
                      />
                      <span className="text-sm text-cream-700 break-words line-clamp-2">{name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-50/50 border-b border-cream-100 text-left text-xs font-semibold text-cream-500 uppercase tracking-wide">
                <th className="px-4 py-3 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('entity_name')}>
                  {entityType} <SortIcon col="entity_name" />
                </th>
                <th className="hidden md:table-cell px-4 py-2 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('period_start')}>
                  Início <SortIcon col="period_start" />
                </th>
                <th className="hidden md:table-cell px-4 py-2 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('period_end')}>
                  Fim <SortIcon col="period_end" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('invoice_date')}>
                  Emissão <SortIcon col="invoice_date" />
                </th>
                <th className="px-4 py-2 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('kwh_value')}>
                  kWh <SortIcon col="kwh_value" />
                </th>
                <th className="px-4 py-2 text-right cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('total_amount')}>
                  Valor (€) <SortIcon col="total_amount" />
                </th>
                <th className="hidden md:table-cell px-4 py-2 cursor-pointer hover:bg-cream-100 transition-colors whitespace-nowrap" onClick={() => toggleSort('document_number')}>
                  Doc. Nº <SortIcon col="document_number" />
                </th>
                <th className="px-3 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-50">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-cream-400 font-medium bg-white">
                    Sem faturas de {title.toLowerCase()} registadas.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((inv) => (
                  <tr key={inv.id} className="hover:bg-cream-50 transition-colors bg-white">
                    <td className="px-4 py-2 font-medium text-cream-900 whitespace-nowrap">{inv.entity_name}</td>
                    <td className="hidden md:table-cell px-4 py-2 text-cream-600 font-medium whitespace-nowrap">{fmtDate(inv.period_start)}</td>
                    <td className="hidden md:table-cell px-4 py-2 text-cream-600 font-medium whitespace-nowrap">{fmtDate(inv.period_end)}</td>
                    <td className="px-4 py-2 text-cream-600 font-medium whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-forest-700 whitespace-nowrap">{fmtKwh(inv.kwh_value)}</td>
                    <td className="px-4 py-2 text-right font-bold text-cream-900 whitespace-nowrap">{fmtEur(inv.total_amount)}</td>
                    <td className="hidden md:table-cell px-4 py-2 text-cream-500 whitespace-nowrap">{inv.document_number || '—'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1.5 text-cream-400 hover:text-forest-600 hover:bg-forest-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="p-1.5 text-cream-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Apagar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="px-6 py-4 bg-cream-50 border-t border-cream-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-cream-500 uppercase tracking-wider">Ver</span>
                <select 
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs font-semibold text-forest-700 bg-white border border-cream-200 rounded-lg px-2 py-1.5 focus:ring-forest-500 focus:border-forest-500 outline-none transition-shadow shadow-sm"
                >
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs font-medium text-cream-500 uppercase tracking-wider">por página</span>
              </div>
              <div className="h-4 w-px bg-cream-200 hidden sm:block" />
              <p className="text-xs text-cream-600 font-medium whitespace-nowrap">
                Mostrando <span className="font-bold text-cream-900">{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</span> 
                {totalItems > 1 && <> a <span className="font-bold text-cream-900">{Math.min(totalItems, currentPage * pageSize)}</span></>}
                {" "}de <span className="font-bold text-cream-900">{totalItems}</span> faturas
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 text-cream-500 hover:text-forest-700 hover:bg-white border border-transparent hover:border-cream-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all group"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
              
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                  .map((p, i, arr) => (
                    <div key={p} className="flex items-center">
                      {i > 0 && arr[i-1] !== p - 1 && (
                        <span className="px-1 text-cream-400 text-xs">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all shadow-sm ${
                          currentPage === p 
                            ? 'bg-forest-600 text-white shadow-forest-200' 
                            : 'bg-white text-cream-600 hover:text-forest-700 border border-cream-200 hover:border-forest-300'
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-cream-500 hover:text-forest-700 hover:bg-white border border-transparent hover:border-cream-200 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all group"
                title="Página Seguinte"
              >
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {editingInvoice && (
        <InvoiceForm 
          tarifaPlants={tarifaPlants} 
          locations={locations} 
          invoiceToEdit={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
      )}
    </>
  )
}
