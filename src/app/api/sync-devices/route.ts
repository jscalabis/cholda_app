import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sync-devices
 * Discovers new pump devices from pump_brackets/pump_readings
 * and inserts them into the pump_devices registry table.
 */
export async function POST() {
  const supabase = await createClient()

  // Discover all unique device_ids from pump_brackets (canonical source)
  const [bracketsRes, existingRes] = await Promise.all([
    supabase.from('pump_brackets').select('device_id'),
    supabase.from('pump_devices').select('device_id'),
  ])

  // Collect all unique device_ids from raw data
  const rawDeviceIds = new Set<string>()
  for (const row of bracketsRes.data ?? []) {
    if (row.device_id) rawDeviceIds.add(row.device_id)
  }

  // Find which ones are already registered
  const existingIds = new Set(
    (existingRes.data ?? []).map((d: { device_id: string }) => d.device_id)
  )

  // Determine new devices
  const newDeviceIds = [...rawDeviceIds].filter((id) => !existingIds.has(id))

  if (newDeviceIds.length === 0) {
    return NextResponse.json({
      message: 'Nenhum novo dispositivo encontrado.',
      new_devices: [],
      total_devices: existingIds.size,
    })
  }

  // Insert new devices
  const { error } = await supabase.from('pump_devices').insert(
    newDeviceIds.map((device_id) => ({
      device_id,
      display_name: device_id,
      is_active: true,
    }))
  )

  if (error) {
    return NextResponse.json(
      { message: `Erro ao inserir dispositivos: ${error.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: `${newDeviceIds.length} novo(s) dispositivo(s) adicionado(s).`,
    new_devices: newDeviceIds,
    total_devices: existingIds.size + newDeviceIds.length,
  })
}
