import Link from 'next/link'
import { Settings2, Sun, Droplets } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NewLocationDialog } from '@/components/settings/NewLocationDialog'
import { SyncDevicesButton } from '@/components/settings/SyncDevicesButton'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const [locationsRes, plantsRes, pumpsRes] = await Promise.all([
    supabase.from('locations').select('*, location_sources(count)').order('name'),
    supabase.from('fusion_plants').select('plant_code').eq('is_active', true),
    supabase.from('pump_devices').select('device_id').eq('is_active', true),
  ])

  const locations = locationsRes.data
  const totalPlants = (plantsRes.data ?? []).length
  const totalPumps = (pumpsRes.data ?? []).length

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-cream-900">Configurações</h1>
          <p className="text-sm text-cream-500">Gerir localizações e fontes de dados</p>
        </div>
        <NewLocationDialog />
      </div>

      {/* Device registry summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-cream-700">
                  <strong>{totalPlants}</strong> parques solares
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-cream-700">
                  <strong>{totalPumps}</strong> bombas de rega
                </span>
              </div>
            </div>
            <SyncDevicesButton />
          </div>
        </CardContent>
      </Card>

      {!locations?.length ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Nenhuma localização ainda. Crie uma acima.
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{loc.name}</p>
                  {loc.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{loc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={loc.is_active ? 'success' : 'secondary'}>
                    {loc.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/settings/locations/${loc.id}`}>
                      <Settings2 className="h-4 w-4 mr-1" />
                      Configurar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
