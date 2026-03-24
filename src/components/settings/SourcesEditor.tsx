'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { LocationSource } from '@/lib/types'

interface AvailableSource {
  id: string
  label: string
}

interface Props {
  locationId: string
  sourceType: 'fusion_plant' | 'pump_device'
  category: 'production' | 'consumption'
  available: AvailableSource[]
  current: LocationSource[]
}

export function SourcesEditor({ locationId, sourceType, category, available, current }: Props) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const activeIds = new Set(
    current
      .filter((s) => s.is_active)
      .map((s) => (sourceType === 'fusion_plant' ? s.plant_code : s.pump_device_id))
  )

  const notYetAdded = available.filter((a) => !activeIds.has(a.id))

  async function handleAdd() {
    if (!selectedId) return
    setLoading(true)
    const supabase = createClient()

    const row: Record<string, unknown> = {
      location_id: locationId,
      source_type: sourceType,
      category,
      is_active: true,
    }
    if (sourceType === 'fusion_plant') row.plant_code = selectedId
    else row.pump_device_id = selectedId

    await supabase.from('location_sources').insert(row)
    setSelectedId('')
    setLoading(false)
    router.refresh()
  }

  async function handleRemove(sourceId: string) {
    const supabase = createClient()
    await supabase.from('location_sources').delete().eq('id', sourceId)
    router.refresh()
  }

  const activeLabel = (src: LocationSource) => {
    const rawId = sourceType === 'fusion_plant' ? src.plant_code : src.pump_device_id
    const match = available.find((a) => a.id === rawId)
    return src.display_name ?? match?.label ?? rawId ?? '—'
  }

  return (
    <div className="space-y-3">
      {/* Current active sources */}
      {current.filter((s) => s.is_active).length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum adicionado ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {current
            .filter((s) => s.is_active)
            .map((src) => (
              <div key={src.id} className="flex items-center gap-1 bg-slate-100 rounded-full pl-3 pr-1.5 py-1">
                <span className="text-xs text-slate-700 font-medium">{activeLabel(src)}</span>
                <button
                  onClick={() => handleRemove(src.id)}
                  className="text-slate-400 hover:text-red-500 ml-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Add new */}
      {notYetAdded.length > 0 && (
        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {notYetAdded.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAdd} disabled={loading || !selectedId}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
