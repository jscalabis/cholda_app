import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SourcesEditor } from '@/components/settings/SourcesEditor'
import { PvModeEditor } from '@/components/settings/PvModeEditor'
import { LocationDetailsForm } from '@/components/settings/LocationDetailsForm'
import type { Location, LocationSource, PvModePeriod, FusionPlant, PumpDevice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LocationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [locRes, sourcesRes, periodsRes, plantsRes, pumpsRes] = await Promise.all([
    supabase.from('locations').select('*').eq('id', id).single(),
    supabase.from('location_sources').select('*').eq('location_id', id).order('category'),
    supabase.from('pv_mode_periods').select('*').eq('location_id', id).order('starts_at', { ascending: false }),
    supabase.from('fusion_plants').select('plant_code, plant_name, capacity_kwp').eq('is_active', true),
    supabase.from('pump_devices').select('device_id, display_name').eq('is_active', true).order('display_name'),
  ])

  if (!locRes.data) notFound()

  const location = locRes.data as Location
  const sources = (sourcesRes.data ?? []) as LocationSource[]
  const periods = (periodsRes.data ?? []) as PvModePeriod[]
  const plants = (plantsRes.data ?? []) as FusionPlant[]
  const pumps = (pumpsRes.data ?? []) as PumpDevice[]

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{location.name}</h1>
          <p className="text-sm text-slate-500">Configuração da localização</p>
        </div>
      </div>

      {/* Basic details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <LocationDetailsForm location={location} />
        </CardContent>
      </Card>

      {/* Fusion plants */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Parques fotovoltaicos (produção)</CardTitle>
        </CardHeader>
        <CardContent>
          <SourcesEditor
            locationId={id}
            sourceType="fusion_plant"
            category="production"
            available={plants.map((p) => ({ id: p.plant_code, label: `${p.plant_name} (${p.capacity_kwp} kWp)` }))}
            current={sources.filter((s) => s.source_type === 'fusion_plant')}
          />
        </CardContent>
      </Card>

      {/* Pump devices */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Bombas de rega (consumo)</CardTitle>
        </CardHeader>
        <CardContent>
          <SourcesEditor
            locationId={id}
            sourceType="pump_device"
            category="consumption"
            available={pumps.map((p) => ({ id: p.device_id, label: p.display_name ?? p.device_id }))}
            current={sources.filter((s) => s.source_type === 'pump_device')}
          />
        </CardContent>
      </Card>

      {/* PV mode periods */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Modo PV (autoconsumo / tarifa)</CardTitle>
        </CardHeader>
        <CardContent>
          <PvModeEditor locationId={id} periods={periods} />
        </CardContent>
      </Card>
    </div>
  )
}
