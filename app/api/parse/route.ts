import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rawData } = await req.json()
    if (!rawData?.trim()) {
      return NextResponse.json({ error: 'Keine Daten' }, { status: 400 })
    }

    const parsed = parseRohdaten(rawData)
    return NextResponse.json({ parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function parseRohdaten(raw: string) {
  // Zeilen bereinigen
  const lines = raw.split('\n').map(l => l.trim())
  
  const eintraege: Array<{
    interne_id: string
    bezeichnung: string | null
    kundenname: string | null
    standort: string | null
    meldungstyp: 'offline' | 'stoerung'
    evse_id: string | null
    prioritaet: string | null
  }> = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Überspringe Leerzeilen
    if (!line) { i++; continue }
    
    // Tab-separierte Zeile = Stationszeile
    if (line.includes('\t')) {
      const teile = line.split('\t').map(t => t.trim())
      
      const interne_id = teile[0] || null
      // teile[1] = Großbuchstaben-ID → ignorieren
      const evse_id = teile[2] && teile[2] !== '-' ? teile[2] : null
      const bezeichnung = teile[3] || null
      const standort_raw = teile[4] && teile[4] !== '-' ? teile[4] : null

      if (!interne_id) { i++; continue }

      // Nächste Zeilen: Meldungstyp und Priorität
      let meldungstyp_raw = ''
      let prioritaet = null
      let j = i + 1
      
      while (j < lines.length && !lines[j].includes('\t')) {
        const nl = lines[j].trim()
        if (nl === 'Offline' || nl === 'Störung' || nl === 'Stoerung') {
          meldungstyp_raw = nl
        } else if (nl && nl !== '') {
          prioritaet = nl
        }
        j++
        // Stoppe nach 3 Zeilen
        if (j > i + 4) break
      }

      // Nur Offline und Störung aufnehmen
      if (meldungstyp_raw === 'Offline' || meldungstyp_raw === 'Störung' || meldungstyp_raw === 'Stoerung') {
        const meldungstyp = meldungstyp_raw === 'Offline' ? 'offline' : 'stoerung'
        
        eintraege.push({
          interne_id,
          bezeichnung,
          kundenname: standort_raw,
          standort: null,
          meldungstyp,
          evse_id,
          prioritaet,
        })
      }

      i = j
      continue
    }
    
    i++
  }

  // Gruppiere nach Station-ID
  const stationenMap = new Map<string, any>()
  
  for (const eintrag of eintraege) {
    const existing = stationenMap.get(eintrag.interne_id)
    
    if (existing) {
      // Offline hat Vorrang
      if (eintrag.meldungstyp === 'offline') {
        existing.meldungstyp = 'offline'
      }
      // Ladepunkt hinzufügen wenn EVSE-ID neu
      const evseIds = existing.ladepunkte.map((lp: any) => lp.evse_id)
      if (eintrag.evse_id && !evseIds.includes(eintrag.evse_id)) {
        existing.ladepunkte.push({ evse_id: eintrag.evse_id, prioritaet: eintrag.prioritaet })
      } else if (!eintrag.evse_id && existing.ladepunkte.length === 0) {
        existing.ladepunkte.push({ evse_id: null, prioritaet: eintrag.prioritaet })
      }
    } else {
      stationenMap.set(eintrag.interne_id, {
        interne_id: eintrag.interne_id,
        bezeichnung: eintrag.bezeichnung,
        kundenname: eintrag.kundenname,
        standort: eintrag.standort,
        meldungstyp: eintrag.meldungstyp,
        ladepunkte: [{ evse_id: eintrag.evse_id, prioritaet: eintrag.prioritaet }],
      })
    }
  }

  return Array.from(stationenMap.values())
}
