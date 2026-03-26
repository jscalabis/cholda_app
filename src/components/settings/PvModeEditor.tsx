'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { PvModePeriod } from '@/lib/types'

interface Props {
  locationId: string
  periods: PvModePeriod[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PvModeEditor({ locationId, periods }: Props) {
  const [mode, setMode] = useState<'autoconsumo' | 'tarifa'>('autoconsumo')
  const [startsAt, setStartsAt] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAdd() {
    if (!startsAt) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('pv_mode_periods').insert({
      location_id: locationId,
      mode,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: null,
    })
    setStartsAt('')
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(periodId: string) {
    const supabase = createClient()
    await supabase.from('pv_mode_periods').delete().eq('id', periodId)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Existing periods */}
      {periods.length === 0 ? (
        <p className="text-sm text-slate-400">
          Nenhum período definido. Sem configuração, o autoconsumo não é calculado.
        </p>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex items-center gap-3">
                <Badge variant={p.mode === 'autoconsumo' ? 'success' : 'secondary'}>
                  {p.mode === 'autoconsumo' ? 'Autoconsumo' : 'Tarifa'}
                </Badge>
                <span className="text-sm text-slate-600">
                  a partir de {formatDate(p.starts_at)}
                  {p.ends_at ? ` até ${formatDate(p.ends_at)}` : ' (atual)'}
                </span>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new period */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end border-t border-slate-100 pt-4">
        <div className="space-y-1.5">
          <Label>Modo</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="autoconsumo">Autoconsumo</SelectItem>
              <SelectItem value="tarifa">Tarifa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="starts-at">A partir de</Label>
          <Input
            id="starts-at"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={handleAdd} disabled={loading || !startsAt}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  )
}
