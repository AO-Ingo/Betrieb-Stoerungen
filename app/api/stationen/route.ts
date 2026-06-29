import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const typ = searchParams.get('typ')
    const supabase = getSupabase()

    let query = supabase
      .from('stationen')
      .select('*, ladepunkte(*)')
      .order('erstellt_am', { ascending: false })

    if (typ) query = query.eq('meldungstyp', typ)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ stationen: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { stationen } = await req.json()

    const ergebnisse = { neu: 0, ladepunkte_hinzugefuegt: 0, duplikate: 0, fehler: [] as string[] }

    for (const station of stationen) {
      const { data: existing } = await supabase
        .from('stationen')
        .select('id, meldungstyp')
        .eq('interne_id', station.interne_id)
        .maybeSingle()

      if (existing) {
        if (existing.meldungstyp === 'stoerung' && station.meldungstyp === 'offline') {
          await supabase.from('stationen').update({ meldungstyp: 'offline' }).eq('id', existing.id)
        }
        for (const lp of station.ladepunkte) {
          if (!lp.evse_id) continue
          const { data: existingLp } = await supabase
            .from('ladepunkte').select('id')
            .eq('station_id', existing.id).eq('evse_id', lp.evse_id).maybeSingle()
          if (!existingLp) {
            await supabase.from('ladepunkte').insert({ station_id: existing.id, evse_id: lp.evse_id, prioritaet: lp.prioritaet })
            ergebnisse.ladepunkte_hinzugefuegt++
          }
        }
        ergebnisse.duplikate++
      } else {
        const { data: newStation, error } = await supabase
          .from('stationen')
          .insert({ interne_id: station.interne_id, bezeichnung: station.bezeichnung, kundenname: station.kundenname, standort: station.standort, meldungstyp: station.meldungstyp })
          .select('id').single()

        if (error || !newStation) {
          ergebnisse.fehler.push(`Fehler bei ${station.interne_id}: ${error?.message}`)
          continue
        }
        if (station.ladepunkte.length > 0) {
          await supabase.from('ladepunkte').insert(
            station.ladepunkte.map((lp: any) => ({ station_id: newStation.id, evse_id: lp.evse_id, prioritaet: lp.prioritaet }))
          )
        }
        ergebnisse.neu++
      }
    }
    return NextResponse.json(ergebnisse)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
