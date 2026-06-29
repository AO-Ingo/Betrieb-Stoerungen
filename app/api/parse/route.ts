import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { rawData } = await req.json()

  if (!rawData?.trim()) {
    return NextResponse.json({ error: 'Keine Daten' }, { status: 400 })
  }

  const prompt = `Du bist ein Daten-Parser für Ladestations-Exportdaten.

Die Rohdaten haben folgende Tab-separierte Spaltenstruktur (Zeilen können durch Leerzeilen getrennt sein):
Spalte 1: Interne Station-ID (Primärschlüssel)
Spalte 2: ID in Großbuchstaben (ignorieren – Duplikat von Spalte 1)
Spalte 3: EVSE-ID (5-stelliger Code, kann "-" sein → dann null)
Spalte 4: Interne Bezeichnung
Spalte 5: Kundenname / Standort
Spalte 6: Meldungstyp ("Offline" oder "Störung")
Spalte 7: Priorität ("Mittel", "Wichtig", "Fehlerfrei" etc.)

Regeln:
- Gruppiere Zeilen mit gleicher Station-ID (Spalte 1) zu einer Station
- Jede Zeile mit einer eigenen EVSE-ID ist ein eigener Ladepunkt
- Behalte NUR Einträge mit Meldungstyp "Offline" ODER "Störung"
- "Fehlerfrei" ist KEIN Ausschlussgrund – nur der Meldungstyp entscheidet
- Wenn eine Station "Offline"-Zeilen hat, setze meldungstyp = "offline"
- Wenn eine Station nur "Störung"-Zeilen hat, setze meldungstyp = "stoerung"
- "-" bei EVSE-ID → null

Antworte NUR mit einem JSON-Array (kein Markdown, keine Erklärung):
[
  {
    "interne_id": "string",
    "bezeichnung": "string oder null",
    "kundenname": "string oder null",
    "standort": "string oder null",
    "meldungstyp": "offline" | "stoerung",
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
