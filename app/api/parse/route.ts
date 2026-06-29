import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { rawData } = await req.json()

  if (!rawData?.trim()) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 400 })
  }

  const prompt = `Du bist ein Daten-Parser für Ladestations-Exportdaten.

Das Datenformat: Die Daten kommen als Mix aus Tabs und Zeilenumbrüchen.
Jeder Eintrag hat folgende Struktur:
- Zeile 1 (TAB-separiert): [Station-ID] [TAB] [ID-Großbuchstaben] [TAB] [EVSE-ID] [TAB] [Interne Bezeichnung] [TAB] [Kundenname/Standort]
- Zeile 2: leer oder Zeilenumbruch
- Zeile 3: Meldungstyp ("Offline" oder "Störung")
- Zeile 4: Priorität ("Mittel", "Wichtig", "Fehlerfrei")
Dann Leerzeile vor dem nächsten Eintrag.

Regeln:
1. Gruppiere Einträge mit gleicher Station-ID zu einer Station mit mehreren Ladepunkten
2. Jeder Eintrag mit eigener EVSE-ID ist ein Ladepunkt
3. Nimm NUR Einträge mit Meldungstyp "Offline" oder "Störung" auf
4. Priorität ist KEIN Filter - alle kommen rein unabhängig von Fehlerfrei/Mittel/Wichtig
5. Wenn Station "Offline" hat → meldungstyp = "offline"
6. Wenn Station nur "Störung" hat → meldungstyp = "stoerung"
7. EVSE-ID "-" → null
8. Spalte 2 (Großbuchstaben) immer ignorieren
9. Standort = Spalte 5 wenn nicht "-", sonst null

Antworte NUR mit reinem JSON-Array, kein Markdown, keine Erklärung, kein Text davor oder danach:
[{"interne_id":"...","bezeichnung":"...","kundenname":"...","standort":"...","meldungstyp":"offline","ladepunkte":[{"evse_id":"...","prioritaet":"..."}]}]

Rohdaten:
${rawData}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    const parsed = JSON.parse(cleaned)
    return NextResponse.json({ parsed })
  } catch (e: any) {
    console.error('Parse error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
