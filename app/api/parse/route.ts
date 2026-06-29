import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { rawData } = await req.json()

  if (!rawData?.trim()) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 400 })
  }

  const prompt = `Du bist ein Daten-Parser für Ladestations-Exportdaten.

Das Datenformat ist WICHTIG zu verstehen: Die Daten kommen als Mix aus Tabs und Zeilenumbrüchen.
Jeder Eintrag hat folgende Struktur - die ersten 5 Felder sind TAB-separiert in einer Zeile,
danach folgen Meldungstyp und Priorität auf eigenen Zeilen:

Zeile 1 (TAB-separiert): [Station-ID] [TAB] [ID-Großbuchstaben] [TAB] [EVSE-ID] [TAB] [Interne Bezeichnung] [TAB] [Kundenname/Standort]
Zeile 2 (leer oder Zeilenumbruch)
Zeile 3: Meldungstyp ("Offline" oder "Störung")  
Zeile 4: Priorität ("Mittel", "Wichtig", "Fehlerfrei")
Dann folgt eine Leerzeile vor dem nächsten Eintrag.

Beispiel-Eingabe:
887jmJMca2oca4Le6W6CsG	887JMJMCA2OCA4LE6W6CSG	EU47R	RE_AdamsLehmannstr.26-42	WEG Adam Lehmannstr. 26-42	
Offline
Mittel

Ergibt:
- Station-ID: "887jmJMca2oca4Le6W6CsG"
- EVSE-ID: "EU47R"
- Bezeichnung: "RE_AdamsLehmannstr.26-42"
- Kundenname: "WEG Adam Lehmannstr. 26-42"
- Meldungstyp: "offline"
- Priorität: "Mittel"

Regeln:
1. Gruppiere Einträge mit gleicher Station-ID zu einer Station mit mehreren Ladepunkten
2. Jeder Eintrag mit eigener EVSE-ID ist ein Ladepunkt
3. Nimm NUR Einträge mit Meldungstyp "Offline" oder "Störung" auf
4. Die Priorität ("Fehlerfrei", "Mittel", "Wichtig") ist KEIN Filter - alle kommen rein
5. Wenn Station "Offline" hat → meldungstyp = "offline"
6. Wenn Station nur "Störung" hat → meldungstyp = "stoerung"  
7. EVSE-ID "-" → null
8. Spalte 2 (Großbuchstaben-ID) immer ignorieren
9. Standort = Spalte 5 wenn vorhanden und nicht "-", sonst null

Antworte NUR mit reinem JSON-Array ohne Markdown:
[
  {
    "interne_id": "string",
    "bezeichnung": "string oder null",
    "kundenname": "string oder null",
    "standort": "string oder null",
    "meldungstyp": "offline",
    "ladepunkte": [
      { "evse_id": "string oder null", "prioritaet": "string oder null" }
    ]
  }
]

Rohdaten:
${rawData}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  
  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json({ parsed })
  } catch {
    return NextResponse.json({ error: 'Parse-Fehler', raw: text }, { status: 500 })
  }
}
