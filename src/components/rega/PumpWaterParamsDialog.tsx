'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Props {
  deviceId: string
  displayName: string
  existing: { method: string | null; mm_per_unit: number | null; notes: string | null } | null
}

export function PumpWaterParamsDialog({ deviceId, displayName, existing }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<'kwh' | 'minutes'>(
    (existing?.method as 'kwh' | 'minutes' | null) ?? 'minutes'
  )
  const [mmPerUnit, setMmPerUnit] = useState(existing?.mm_per_unit?.toString() ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      // Reset to saved values each time the dialog opens
      setMethod((existing?.method as 'kwh' | 'minutes' | null) ?? 'minutes')
      setMmPerUnit(existing?.mm_per_unit?.toString() ?? '')
      setNotes(existing?.notes ?? '')
      setError(null)
    }
  }

  async function handleSave() {
    const value = parseFloat(mmPerUnit)
    if (isNaN(value) || value <= 0) {
      setError('Insira um valor válido maior que zero.')
      return
    }

    setLoading(true)
    setError(null)

    const { error: dbError } = await supabase
      .from('pump_water_params')
      .upsert(
        { device_id: deviceId, method, mm_per_unit: value, notes: notes || null },
        { onConflict: 'device_id' }
      )

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button
          title="Editar parametrização"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-cream-400 hover:text-forest-700 hover:bg-forest-50 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base text-cream-900">
            Parametrização — {displayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream-500 uppercase tracking-wide">
              Método de cálculo
            </label>
            <div className="flex gap-2">
              {(['minutes', 'kwh'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    method === m
                      ? 'bg-forest-700 text-white border-forest-700'
                      : 'bg-white text-cream-600 border-cream-200 hover:border-forest-300'
                  }`}
                >
                  {m === 'kwh' ? 'Por kWh' : 'Por hora'}
                </button>
              ))}
            </div>
          </div>

          {/* mm per unit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream-500 uppercase tracking-wide">
              mm por {method === 'kwh' ? 'kWh' : 'hora'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={mmPerUnit}
                onChange={(e) => setMmPerUnit(e.target.value)}
                placeholder="ex: 2.5"
                className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm text-cream-900 placeholder-cream-300 focus:outline-none focus:ring-2 focus:ring-forest-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cream-400 pointer-events-none">
                mm/{method === 'kwh' ? 'kWh' : 'h'}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-cream-500 uppercase tracking-wide">
              Notas (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Caudal 12 L/min, área 4 200 m²"
              className="w-full rounded-lg border border-cream-200 px-3 py-2 text-sm text-cream-900 placeholder-cream-300 focus:outline-none focus:ring-2 focus:ring-forest-400 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 rounded-lg border border-cream-200 text-sm font-medium text-cream-600 hover:bg-cream-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-forest-700 text-white text-sm font-medium hover:bg-forest-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
