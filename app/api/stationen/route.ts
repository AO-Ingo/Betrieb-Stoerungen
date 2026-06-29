import { NextRequest, NextResponse } from 'next/server'
import { supabase, ParsedStation } from '@/lib/supabase'

// GET: Alle Stationen mit Ladepunkten abrufen
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const typ = searchParams.get('typ') // 'offline' | 'stoerung'

  let query = supabase
    .from('stationen')
    .select(`*, ladepunkte(*)`)
    .order('erstellt_am', { ascending: false })

  if (typ) query = query.eq('meldungstyp', typ)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stationen: data })
}

// POST: Neue Stationen nach Deduplizierung speichern
export async function POST(req: NextRequest) {
  const { stationen }: { stationen: ParsedStation[] } = await req.json()

  const ergebnisse = {
    neu: 0,
    ladepunkte_hinzugefuegt: 0,
    duplikate: 0,
    fehler: [] as string[],
  }

  for (const station of stationen) {
    // Prüfe ob Station bereits existiert
    const { data: existing } = await supabase
      .from('stationen')
      .select('id, meldungstyp')
      .eq('interne_id', station.interne_id)
      .single()

    if (existing) {
      // Station existiert – Offline hat Vorrang
      if (existing.meldungstyp === 'stoerung' && station.meldungstyp === 'offline') {
        await supabase
          .from('stationen')
          .update({ meldungstyp: 'offline' })
          .eq('id', existing.id)
      }

      // Neue Ladepunkte hinzufügen (die noch nicht existieren)
      for (const lp of station.ladepunkte) {
        if (!lp.evse_id) continue

        const { data: existingLp } = await supabase
          .from('ladepunkte')
          .select('id')
          .eq('station_id', existing.id)
          .eq('evse_id', lp.evse_id)
          .single()

        if (!existingLp) {
          await supabase.from('ladepunkte').insert({
            station_id: existing.id,
            evse_id: lp.evse_id,
            prioritaet: lp.prioritaet,
          })
          ergebnisse.ladepunkte_hinzugefuegt++
        }
      }

      ergebnisse.duplikate++
    } else {
      // Neue Station anlegen
      const { data: newStation, error } = await supabase
        .from('stationen')
        .insert({
          interne_id: station.interne_id,
          bezeichnung: station.bezeichnung,
          kundenname: station.kundenname,
          standort: station.standort,
          meldungstyp: station.meldungstyp,
        })
        .select('id')
        .single()

      if (error || !newStation) {
        ergebnisse.fehler.push(`Fehler bei ${station.interne_id}: ${error?.message}`)
        continue
      }

      // Ladepunkte anlegen
      if (station.ladepunkte.length > 0) {
        await supabase.from('ladepunkte').insert(
          station.ladepunkte.map((lp) => ({
            station_id: newStation.id,
            evse_id: lp.evse_id,
            prioritaet: lp.prioritaet,
          }))
        )
      }

      ergebnisse.neu++
    }
  }

  return NextResponse.json(ergebnisse)
}
