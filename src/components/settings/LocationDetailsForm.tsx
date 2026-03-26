'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Location } from '@/lib/types'

interface Props {
  location: Location
}

export function LocationDetailsForm({ location }: Props) {
  const [name, setName] = useState(location.name)
  const [description, setDescription] = useState(location.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('locations')
      .update({ name: name.trim(), description: description.trim() || null })
      .eq('id', location.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Descrição</Label>
          <Input
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Guardado' : saving ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
