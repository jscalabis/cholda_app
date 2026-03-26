'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import type { UnifiedInvoice } from './InvoicesTable'

interface PlantOption {
  plant_code: string
  park_name: string
}

interface LocationOption {
  id: string
  name: string
}

export function InvoiceForm({ 
  tarifaPlants, 
  locations,
  invoiceToEdit,
  onClose
}: { 
  tarifaPlants: PlantOption[]
  locations: LocationOption[]
  invoiceToEdit?: UnifiedInvoice | null
  onClose?: () => void
}) {
  const [isOpen, setIsOpen] = useState(!!invoiceToEdit)
  const [loading, setLoading] = useState(false)
  
  const [invoiceType, setInvoiceType] = useState<'production' | 'consumption' | null>(null)
  const [plantCode, setPlantCode] = useState('')
  const [locationId, setLocationId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [kwhValue, setKwhValue] = useState('')
  const [notes, setNotes] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (invoiceToEdit) {
      setIsOpen(true)
      setInvoiceType(invoiceToEdit.invoice_type)
      
      if (invoiceToEdit.invoice_type === 'production') {
        setPlantCode(invoiceToEdit.entity_id)
      } else {
        setLocationId(invoiceToEdit.entity_id)
      }

      setPeriodStart(invoiceToEdit.period_start)
      setPeriodEnd(invoiceToEdit.period_end)
      setInvoiceDate(invoiceToEdit.invoice_date)
      setDocumentNumber(invoiceToEdit.document_number || '')
      setTotalAmount(invoiceToEdit.total_amount.toString())
      setKwhValue(invoiceToEdit.kwh_value.toString())
      setNotes(invoiceToEdit.notes || '')
    }
  }, [invoiceToEdit])

  function handleClose() {
    setIsOpen(false)
    if (onClose) onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (invoiceType === 'production' && !plantCode) return alert('Por favor, selecione um parque.')
    if (invoiceType === 'consumption' && !locationId) return alert('Por favor, selecione um contador.')
    
    // Double check confirmation for edit
    if (invoiceToEdit && !window.confirm("Pretende guardar as alterações a esta fatura?")) {
      return
    }
    
    setLoading(true)

    const payload = {
      invoice_type: invoiceType,
      plant_code: invoiceType === 'production' ? plantCode : null,
      location_id: invoiceType === 'consumption' ? locationId : null,
      period_start: periodStart,
      period_end: periodEnd,
      invoice_date: invoiceDate,
      document_number: documentNumber,
      total_amount: parseFloat(totalAmount) || 0,
      kwh_value: parseFloat(kwhValue) || 0,
      notes,
    }

    if (invoiceToEdit) {
      const { error } = await supabase.from('invoices').update(payload).eq('id', invoiceToEdit.id)
      setLoading(false)
      if (!error) {
        handleClose()
        router.refresh()
      } else {
        alert('Erro ao atualizar fatura: ' + error.message)
      }
    } else {
      const { error } = await supabase.from('invoices').insert([payload])
      setLoading(false)
      if (!error) {
        setIsOpen(false)
        // reset form
        setInvoiceType(null)
        setPlantCode('')
        setLocationId('')
        setPeriodStart('')
        setPeriodEnd('')
        setInvoiceDate('')
        setDocumentNumber('')
        setTotalAmount('')
        setKwhValue('')
        setNotes('')
        router.refresh()
      } else {
        alert('Erro ao guardar fatura: ' + error.message)
      }
    }
  }

  if (!isOpen) {
    if (onClose) return null // If externally controlled but closed
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium text-sm shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Registar Fatura
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-100 bg-cream-50 rounded-t-xl">
          <h2 className="text-base font-bold text-cream-900 flex items-center gap-2">
            {!invoiceToEdit ? (
              <><Plus className="w-5 h-5 text-forest-600" />Nova Fatura</>
            ) : (
              <><span className="w-5 h-5 text-forest-600 flex items-center justify-center">✎</span>Editar Fatura</>
            )}
          </h2>
          <button onClick={handleClose} className="text-cream-400 hover:text-cream-700 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            
            {/* ROW 1: Type of Invoice */}
            <div className="pb-4 border-b border-cream-100">
              <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide block mb-3">Tipo de Fatura</label>
              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 text-sm text-cream-900 cursor-pointer font-medium hover:text-forest-700 transition-colors">
                  <input 
                    type="radio" 
                    name="invoiceType" 
                    value="production" 
                    disabled={!!invoiceToEdit} // Do not seamlessly allow switching type on an existing invoice if you want clean data (but can be enabled)
                    checked={invoiceType === 'production'} 
                    onChange={() => {
                      setInvoiceType('production')
                      setLocationId('') // Reset the other selection
                    }}
                    className="w-4 h-4 text-forest-600 focus:ring-forest-500 border-cream-300"
                  />
                  Produção (Venda)
                </label>
                <label className="flex items-center gap-2 text-sm text-cream-900 cursor-pointer font-medium hover:text-forest-700 transition-colors">
                  <input 
                    type="radio" 
                    name="invoiceType" 
                    value="consumption" 
                    disabled={!!invoiceToEdit} 
                    checked={invoiceType === 'consumption'} 
                    onChange={() => {
                      setInvoiceType('consumption')
                      setPlantCode('') // Reset the other selection
                    }}
                    className="w-4 h-4 text-forest-600 focus:ring-forest-500 border-cream-300"
                  />
                  Consumo (Compra)
                </label>
              </div>
            </div>

            {invoiceType && (
              <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* ROW 2: Name of park/contador AND Date of invoice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">
                      {invoiceType === 'production' ? 'Nome do Parque' : 'Nome do Contador'}
                    </label>
                    {invoiceType === 'production' ? (
                      <select 
                        required
                        value={plantCode}
                        onChange={(e) => setPlantCode(e.target.value)}
                        className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500 bg-white"
                      >
                        <option value="" disabled>Selecione um parque...</option>
                        {tarifaPlants.map((p) => (
                          <option key={p.plant_code} value={p.plant_code}>{p.park_name || p.plant_code}</option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        required
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500 bg-white"
                      >
                        <option value="" disabled>Selecione um contador...</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Data da Fatura</label>
                    <input 
                      type="date" 
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                </div>

                {/* ROW 3: Start and End date of billing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Início da Faturação</label>
                    <input 
                      type="date" 
                      required
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Fim da Faturação</label>
                    <input 
                      type="date" 
                      required
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                </div>

                {/* ROW 4: Total kWh AND Total € */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Total de Energia (kWh)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={kwhValue}
                        onChange={(e) => setKwhValue(e.target.value)}
                        placeholder="Ex: 500.5"
                        className="w-full px-3 py-2 pr-12 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 text-sm pointer-events-none">kWh</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Total da Fatura (€)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        placeholder="Ex: 125.50"
                        className="w-full px-3 py-2 pl-7 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-400 text-sm pointer-events-none">€</span>
                    </div>
                  </div>
                </div>

                {/* ROW 5: Document nr AND Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Nº do Documento</label>
                    <input 
                      type="text" 
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Ex: FT 2026/123"
                      className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-cream-600 uppercase tracking-wide">Notas (Opcional)</label>
                    <textarea 
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Observações adicionais..."
                      className="w-full px-3 py-2 border border-cream-200 rounded-lg text-sm focus:ring-2 focus:ring-forest-500 focus:border-forest-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6 mt-6 border-t border-cream-100">
            <button 
              type="button"
              onClick={handleClose}
              className="px-5 py-2 mr-3 text-sm font-medium text-cream-600 hover:text-cream-900 focus:outline-none transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading || !invoiceType}
              className="px-6 py-2 bg-forest-600 text-white rounded-lg hover:bg-forest-700 transition-colors font-medium text-sm focus:ring-2 focus:ring-offset-2 focus:ring-forest-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A Guardar...' : (invoiceToEdit ? 'Salvar Alterações' : 'Salvar Fatura')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
