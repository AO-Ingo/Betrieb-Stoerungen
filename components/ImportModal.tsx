'use client'

import { useState } from 'react'
import { ParsedStation } from '@/lib/supabase'
import { X, Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ImportErgebnis {
  neu: number
  ladepunkte_hinzugefuegt: number
  duplikate: number
  fehler: string[]
}

interface Props {
  onClose: () => void
  onImportiert: () => void
}

export default function ImportModal({ onClose, onImportiert }: Props) {
  const [rohdaten, setRohdaten] = useState('')
  const [schritt, setSchritt] = useState<'eingabe' | 'vorschau' | 'ergebnis'>('eingabe')
  const [parsed, setParsed] = useState<ParsedStation[]>([])
  const [ergebnis, setErgebnis] = useState<ImportErgebnis | null>(null)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  async function parsen() {
    setLaden(true)
    setFehler('')
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawData: rohdaten }),
      })
      
      const text = await res.text()
      
      if (!text || text.trim() === '') {
        throw new Error('Leere Antwort vom Server. Bitte Vercel Environment Variables prüfen.')
      }
      
      let data: any
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`Server-Antwort ist kein JSON: ${text.substring(0, 200)}`)
      }
      
      if (!res.ok || data.error) {
        throw new Error(data.error || `Server-Fehler ${res.status}`)
      }
      
      if (!data.parsed || data.parsed.length === 0) {
        throw new Error('Keine Stationen erkannt. Bitte Datenformat prüfen.')
      }
      
      setParsed(data.parsed)
      setSchritt('vorschau')
    } catch (e: any) {
      setFehler(e.message)
    } finally {
      setLaden(false)
    }
  }

  async function importieren() {
    setLaden(true)
    try {
      const res = await fetch('/api/stationen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationen: parsed }),
      })
      const data = await res.json()
      setErgebnis(data)
      setSchritt('ergebnis')
      onImportiert()
    } catch (e: any) {
      setFehler(e.message)
    } finally {
      setLaden(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Daten importieren</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {schritt === 'eingabe' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Rohdaten aus dem Flottenmanagement-System einfügen. Der Parser erkennt automatisch
                Offline- und Störungs-Meldungen und filtert Duplikate.
              </p>
              <textarea
                value={rohdaten}
                onChange={(e) => setRohdaten(e.target.value)}
                placeholder="Rohdaten hier einfügen..."
                className="w-full h-64 font-mono text-xs border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fehler && (
                <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{fehler}</span>
                </div>
              )}
            </div>
          )}

          {schritt === 'vorschau' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                  {parsed.length} Stationen erkannt
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                  {parsed.filter((s) => s.meldungstyp === 'offline').length} Offline
                </span>
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                  {parsed.filter((s) => s.meldungstyp === 'stoerung').length} Störung
                </span>
              </div>
              <div className="space-y-2">
                {parsed.map((station, i) => (
                  <div key={i} className="border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs text-gray-500">{station.interne_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        station.meldungstyp === 'offline'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {station.meldungstyp === 'offline' ? 'Offline' : 'Störung'}
                      </span>
                    </div>
                    <div className="font-medium text-gray-800">{station.kundenname}</div>
                    {station.standort && (
                      <div className="text-gray-500 text-xs">{station.standort}</div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {station.ladepunkte.map((lp, j) => (
                        <span key={j} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs font-mono">
                          {lp.evse_id ?? '–'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schritt === 'ergebnis' && ergebnis && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-medium">Import abgeschlossen</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{ergebnis.neu}</div>
                  <div className="text-xs text-green-600 mt-1">Neue Stationen</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{ergebnis.ladepunkte_hinzugefuegt}</div>
                  <div className="text-xs text-blue-600 mt-1">Ladepunkte ergänzt</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-600">{ergebnis.duplikate}</div>
                  <div className="text-xs text-gray-500 mt-1">Bereits bekannt</div>
                </div>
              </div>
              {ergebnis.fehler.length > 0 && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-red-700 mb-1">Fehler:</div>
                  {ergebnis.fehler.map((f, i) => (
                    <div key={i} className="text-xs text-red-600">{f}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          {schritt === 'eingabe' && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Abbrechen
              </button>
              <button
                onClick={parsen}
                disabled={!rohdaten.trim() || laden}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {laden && <Loader2 size={14} className="animate-spin" />}
                <Upload size={14} />
                Analysieren
              </button>
            </>
          )}
          {schritt === 'vorschau' && (
            <>
              <button onClick={() => setSchritt('eingabe')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Zurück
              </button>
              <button
                onClick={importieren}
                disabled={laden}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {laden && <Loader2 size={14} className="animate-spin" />}
                {parsed.length} Stationen importieren
              </button>
            </>
          )}
          {schritt === 'ergebnis' && (
            <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Fertig
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
