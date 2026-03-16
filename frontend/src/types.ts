// Shared domain types used across the frontend.
// API responses use snake_case to match the backend directly.

export interface Preference {
  id: string
  origin: string
  destination: string
  departure_period: string
  return_period?: string
  budget?: number
  max_stops: number
  cabin_class: string
  date_flexibility: string
  nearby_airports: boolean
  priority: string
  alert_frequency: string
  additional_context?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  email_subject: string
  email_body_html: string
  sent_at: string
  reasoning: string
  reference_price: number | null
  alert_type: string
}
