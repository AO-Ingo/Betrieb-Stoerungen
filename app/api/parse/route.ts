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
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 500 })
  }
}

function parseRohdaten(raw: string) {
  const eintraege: any[] = []
  
  // Normalisiere Zeilenenden
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = text.split('\n')
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    
    // Überspringe Leerzeilen
    if (!line || !line.trim()) { i++; continue }
    
    // Prüfe ob Tab-separierte Zeile (Stationszeile)
    const hasTabs = line.includes('\t')
    const teile = hasTabs 
      ? line.split('\t').map((t: string) => t.trim())
      : line.split(/\s{2,}/).map((t: string) => t.trim()) // Fallback: mehrere Leerzeichen
    
    // Brauchen mindestens 2 Felder für eine Stationszeile
    if (teile.length >= 2 && teile[0] && !['Offline', 'Störung', 'Stoerung', 'Mittel', 'Wichtig', 'Fehlerfrei'].includes(teile[0])) {
      const interne_id = teile[0]
      const evse_id = teile[2] && teile[2] !== '-' ? teile[2] : null
      const bezeichnung = teile[3] || null
      const standort_raw = teile[4] && teile[4] !== '-' ? teile[4] : null

      // Suche Meldungstyp in nächsten 5 Zeilen
      let meldungstyp_raw = ''
      let prioritaet = null
      let j = i + 1
      while (j < lines.length && j < i + 6) {
        const nl = lines[j].trim()
        if (nl === 'Offline') { meldungstyp_raw = 'Offline'; j++; continue }
        if (nl === 'Störung' || nl === 'Stoerung') { meldungstyp_raw = 'Störung'; j++; continue }
        if (['Mittel', 'Wichtig', 'Fehlerfrei', 'Niedrig', 'Hoch'].includes(nl)) { prioritaet = nl; j++; continue }
        if (nl === '') { j++; continue }
        break
      }

      if (meldungstyp_raw === 'Offline' || meldungstyp_raw === 'Störung') {
        const meldungstyp = meldungstyp_raw === 'Offline' ? 'offline' : 'stoerung'
        eintraege.push({ interne_id, bezeichnung, kundenname: standort_raw, standort: null, meldungstyp, evse_id, prioritaet })
      }
      i = j
      continue
    }
    i++
  }

  // Gruppiere nach Station-ID
  const stationenMap = new Map<string, any>()
  for (const e of eintraege) {
    const existing = stationenMap.get(e.interne_id)
    if (existing) {
      if (e.meldungstyp === 'offline') existing.meldungstyp = 'offline'
      const evseIds = existing.ladepunkte.map((lp: any) => lp.evse_id)
      if (e.evse_id && !evseIds.includes(e.evse_id)) {
        existing.ladepunkte.push({ evse_id: e.evse_id, prioritaet: e.prioritaet })
      }
    } else {
      stationenMap.set(e.interne_id, {
        interne_id: e.interne_id,
        bezeichnung: e.bezeichnung,
        kundenname: e.kundenname,
        standort: null,
        meldungstyp: e.meldungstyp,
        ladepunkte: [{ evse_id: e.evse_id, prioritaet: e.prioritaet }],
      })
    }
  }

  return Array.from(stationenMap.values())
}
