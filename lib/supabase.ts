import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Meldungstyp = 'offline' | 'stoerung'

export interface Ladepunkt {
  id: string
  station_id: string
  evse_id: string | null
  prioritaet: string | null
  erstellt_am: string
}

export interface Station {
  id: string
  interne_id: string
  bezeichnung: string | null
  kundenname: string | null
  standort: string | null
  meldungstyp: Meldungstyp
  zoho_ticket_id: string | null
  zoho_ticket_url: string | null
  notizen: string | null
  erstellt_am: string
  aktualisiert_am: string
  ladepunkte?: Ladepunkt[]
}

export interface ParsedStation {
  interne_id: string
  bezeichnung: string | null
  kundenname: string | null
  standort: string | null
  meldungstyp: Meldungstyp
  ladepunkte: Array<{
    evse_id: string | null
    prioritaet: string | null
  }>
}
