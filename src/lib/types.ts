// ─── Core domain types ────────────────────────────────────────────────────────

export interface Location {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface LocationSource {
  id: string
  location_id: string
  source_type: 'fusion_plant' | 'pump_device'
  plant_code: string | null
  pump_device_id: string | null
  display_name: string | null
  category: 'production' | 'consumption'
  is_active: boolean
  created_at: string
}

export interface PvModePeriod {
  id: string
  location_id: string
  mode: 'autoconsumo' | 'tarifa'
  starts_at: string
  ends_at: string | null
  created_at: string
}

export interface GridInvoice {
  id: string
  location_id: string
  period_start: string  // ISO date
  period_end: string    // ISO date
  kwh_consumed: number
  total_cost_eur: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface FusionPlant {
  plant_code: string
  plant_name: string
  plant_address: string
  capacity_kwp: number
  is_active: boolean
}

export interface PumpDevice {
  device_id: string
  display_name: string | null
  location_description: string | null
  is_active: boolean
}

// ─── View row types ────────────────────────────────────────────────────────────

export interface ProductionHourlyRow {
  location_id: string
  plant_code: string
  plant_name: string
  hour_start: string  // ISO timestamp
  value_kwh: number
}

export interface ConsumptionHourlyRow {
  location_id: string
  device_id: string
  hour_start: string  // ISO timestamp
  value_kwh: number
}

// ─── Calculation result types ─────────────────────────────────────────────────

export interface HourlyBalance {
  hour_start: string
  production_kwh: number
  consumption_kwh: number
  self_consumed_kwh: number
  mode: 'autoconsumo' | 'tarifa' | null
}

export interface MonthlyEnergySummary {
  location_id: string
  month: string  // 'YYYY-MM'
  total_production_kwh: number
  total_consumption_kwh: number
  total_self_consumed_kwh: number
  grid_consumed_kwh: number
  grid_sold_kwh: number
  autoconsumo_rate: number  // 0–1
  invoice: GridInvoice | null
  invoice_delta_kwh: number | null
}

export interface DeviceBreakdown {
  device_id: string
  display_name: string
  total_kwh: number
  percentage: number
}
