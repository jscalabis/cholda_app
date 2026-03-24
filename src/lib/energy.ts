import type {
  HourlyBalance,
  MonthlyEnergySummary,
  ProductionHourlyRow,
  ConsumptionHourlyRow,
  PvModePeriod,
  GridInvoice,
  DeviceBreakdown,
} from './types'

/**
 * Returns the active PV mode for a given hour timestamp.
 * Falls back to 'autoconsumo' if no period is configured.
 */
function getModeForHour(
  hourStart: Date,
  periods: PvModePeriod[]
): 'autoconsumo' | 'tarifa' | null {
  for (const p of periods) {
    const start = new Date(p.starts_at)
    const end = p.ends_at ? new Date(p.ends_at) : null
    if (hourStart >= start && (end === null || hourStart < end)) {
      return p.mode
    }
  }
  return null
}

/**
 * Computes hourly energy balance for a location in a given period.
 */
export function computeHourlyBalance(
  production: ProductionHourlyRow[],
  consumption: ConsumptionHourlyRow[],
  periods: PvModePeriod[]
): HourlyBalance[] {
  // Aggregate production by hour (sum across all plants)
  const prodByHour = new Map<string, number>()
  for (const row of production) {
    const existing = prodByHour.get(row.hour_start) ?? 0
    prodByHour.set(row.hour_start, existing + row.value_kwh)
  }

  // Aggregate consumption by hour (sum across all devices)
  const consByHour = new Map<string, number>()
  for (const row of consumption) {
    const existing = consByHour.get(row.hour_start) ?? 0
    consByHour.set(row.hour_start, existing + row.value_kwh)
  }

  // Union of all hours
  const allHours = new Set([...prodByHour.keys(), ...consByHour.keys()])

  const result: HourlyBalance[] = []
  for (const hour of allHours) {
    const prodKwh = prodByHour.get(hour) ?? 0
    const consKwh = consByHour.get(hour) ?? 0
    const mode = getModeForHour(new Date(hour), periods)
    const selfConsumed =
      mode === 'autoconsumo' ? Math.min(prodKwh, consKwh) : 0

    result.push({
      hour_start: hour,
      production_kwh: prodKwh,
      consumption_kwh: consKwh,
      self_consumed_kwh: selfConsumed,
      mode,
    })
  }

  return result.sort(
    (a, b) => new Date(a.hour_start).getTime() - new Date(b.hour_start).getTime()
  )
}

/**
 * Aggregates hourly balance into a monthly summary.
 */
export function computeMonthlySummary(
  locationId: string,
  month: string,
  hourlyBalance: HourlyBalance[],
  invoice: GridInvoice | null
): MonthlyEnergySummary {
  let totalProd = 0
  let totalCons = 0
  let totalSelf = 0

  for (const h of hourlyBalance) {
    totalProd += h.production_kwh
    totalCons += h.consumption_kwh
    totalSelf += h.self_consumed_kwh
  }

  const gridConsumed = Math.max(0, totalCons - totalSelf)
  const gridSold = Math.max(0, totalProd - totalSelf)
  const autoconsumoRate = totalProd > 0 ? totalSelf / totalProd : 0

  const invoiceDelta =
    invoice !== null ? gridConsumed - invoice.kwh_consumed : null

  return {
    location_id: locationId,
    month,
    total_production_kwh: totalProd,
    total_consumption_kwh: totalCons,
    total_self_consumed_kwh: totalSelf,
    grid_consumed_kwh: gridConsumed,
    grid_sold_kwh: gridSold,
    autoconsumo_rate: autoconsumoRate,
    invoice,
    invoice_delta_kwh: invoiceDelta,
  }
}

/**
 * Returns device-level breakdown of consumption with percentages.
 */
export function computeDeviceBreakdown(
  consumption: ConsumptionHourlyRow[],
  sourceLabels: Record<string, string>  // pump_device_id → display name
): DeviceBreakdown[] {
  const byDevice = new Map<string, number>()
  for (const row of consumption) {
    const existing = byDevice.get(row.device_id) ?? 0
    byDevice.set(row.device_id, existing + row.value_kwh)
  }

  const total = [...byDevice.values()].reduce((a, b) => a + b, 0)

  return [...byDevice.entries()]
    .map(([deviceId, kwh]) => ({
      device_id: deviceId,
      display_name: sourceLabels[deviceId] ?? deviceId,
      total_kwh: kwh,
      percentage: total > 0 ? (kwh / total) * 100 : 0,
    }))
    .sort((a, b) => b.total_kwh - a.total_kwh)
}

/**
 * Aggregates hourly balance to daily buckets for chart display.
 */
export function aggregateToDailyBuckets(
  hourlyBalance: HourlyBalance[]
): Array<{ date: string; production_kwh: number; consumption_kwh: number; self_consumed_kwh: number }> {
  const byDay = new Map<string, { production_kwh: number; consumption_kwh: number; self_consumed_kwh: number }>()

  for (const h of hourlyBalance) {
    const day = h.hour_start.slice(0, 10)  // 'YYYY-MM-DD'
    const existing = byDay.get(day) ?? { production_kwh: 0, consumption_kwh: 0, self_consumed_kwh: 0 }
    byDay.set(day, {
      production_kwh: existing.production_kwh + h.production_kwh,
      consumption_kwh: existing.consumption_kwh + h.consumption_kwh,
      self_consumed_kwh: existing.self_consumed_kwh + h.self_consumed_kwh,
    })
  }

  return [...byDay.entries()]
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
