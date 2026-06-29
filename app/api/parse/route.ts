import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { rawData } = body

    if (!rawData?.trim()) {
      return NextResponse.json({ error: 'Keine Daten' }, { status: 400 })
    }

    const prompt = `Parse diese Ladestations-Exportdaten in JSON.

Format der Rohdaten: Tab-separierte Felder pro Zeile, dann Zeilenumbrüche für Meldungstyp und Priorität:
Feld 1: Station-ID
Feld 2: ID Großbuchstaben (ignorieren)
Feld 3: EVSE-ID (oder "-" = null)
Feld 4: Interne Bezeichnung
Feld 5: Kundenname/Standort (oder "-" = null)
Nächste Zeile: "Offline" oder "Störung"
Nächste Zeile: Priorität

Regeln:
- Gleiche Station-ID = ein Eintrag mit mehreren Ladepunkten
- Nur "Offline" und "Störung" aufnehmen
- "Offline" → meldungstyp "offline", "Störung" → meldungstyp "stoerung"
- Hat Station Offline-Eintrag → immer "offline" auch wenn andere "Störung" haben

Gib NUR dieses JSON zurück, nichts anderes:
[{"interne_id":"ID","bezeichnung":"TEXT_ODER_NULL","kundenname":"TEXT_ODER_NULL","standort":"TEXT_ODER_NULL","meldungstyp":"offline","ladepunkte":[{"evse_id":"ID_ODER_NULL","prioritaet":"TEXT"}]}]

Daten:
${rawData}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    
    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'Leere Antwort von API' }, { status: 500 })
    }

    // JSON extrahieren - alles vor [ und nach ] entfernen
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return NextResponse.json({ error: `Kein JSON gefunden. Antwort: ${text.substring(0, 200)}` }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ parsed })

  } catch (e: any) {
    console.error('Parse route error:', e)
    return NextResponse.json({ error: e.message || 'Unbekannter Fehler' }, { status: 500 })
  }
}
