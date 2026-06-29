'use client'

import { useEffect, useState, useCallback } from 'react'
import { Station } from '@/lib/supabase'
import StationCard from '@/components/StationCard'
import ImportModal from '@/components/ImportModal'
import { Upload, Zap, AlertTriangle, RefreshCw, Search } from 'lucide-react'

type Tab = 'offline' | 'stoerung'

export default function HomePage() {
  const [aktiveTab, setAktiveTab] = useState<Tab>('offline')
  const [stationen, setStationen] = useState<Station[]>([])
  const [laden, setLaden] = useState(false)
  const [importOffen, setImportOffen] = useState(false)
  const [suche, setSuche] = useState('')
  const [ladeError, setLadeError] = useState('')

  const laden_stationen = useCallback(async () => {
    setLaden(true)
    setLadeError('')
    try {
      const res = await fetch(`/api/stationen?typ=${aktiveTab}`)
      const text = await res.text()
      if (!text || text.trim() === '') {
        throw new Error('Keine Antwort vom Server')
      }
      const data = JSON.parse(text)
      if (data.error) throw new Error(data.error)
      setStationen(data.stationen ?? [])
    } catch (e: any) {
      setLadeError(e.message)
      setStationen([])
    } finally {
      setLaden(false)
    }
  }, [aktiveTab])

  useEffect(() => {
    laden_stationen()
  }, [laden_stationen])

  const gefiltert = stationen.filter((s) => {
    if (!suche) return true
    const q = suche.toLowerCase()
    return (
      s.kundenname?.toLowerCase().includes(q) ||
      s.interne_id.toLowerCase().includes(q) ||
      s.standort?.toLowerCase().includes(q) ||
      s.ladepunkte?.some((lp) => lp.evse_id?.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-blue-600" size={22} />
            <span className="font-semibold text-gray-900 text-lg">Ladestation Tracker</span>
          </div>
          <button
            onClick={() => setImportOffen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload size={15} />
            Daten importieren
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-1 mb-6 bg-white border rounded-xl p-1 w-fit">
          <button
            onClick={() => setAktiveTab('offline')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aktiveTab === 'offline' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap size={14} />
            Offline
            {aktiveTab === 'offline' && (
              <span className="bg-orange-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stationen.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAktiveTab('stoerung')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              aktiveTab === 'stoerung' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertTriangle size={14} />
            Störung
            {aktiveTab === 'stoerung' && (
              <span className="bg-red-400 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stationen.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Suche nach Kunde, Station-ID, EVSE-ID, Standort..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button
            onClick={laden_stationen}
            className="p-2 border rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 bg-white"
          >
            <RefreshCw size={15} className={laden ? 'animate-spin' : ''} />
          </button>
        </div>

        {ladeError && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            Fehler: {ladeError}
          </div>
        )}

        {laden ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-3" />
            <div className="text-sm">Lade Daten...</div>
          </div>
        ) : gefiltert.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">{aktiveTab === 'offline' ? '⚡' : '⚠️'}</div>
            <div className="font-medium text-gray-600 mb-1">
              {suche ? 'Keine Treffer' : `Keine ${aktiveTab === 'offline' ? 'Offline' : 'Störungs'}-Meldungen`}
            </div>
            <div className="text-sm">
              {suche ? 'Suchbegriff anpassen' : 'Daten über „Importieren" hinzufügen'}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {gefiltert.map((station) => (
              <StationCard key={station.id} station={station} onAktualisiert={laden_stationen} />
            ))}
          </div>
        )}
      </main>

      {importOffen && (
        <ImportModal
          onClose={() => setImportOffen(false)}
          onImportiert={laden_stationen}
        />
      )}
    </div>
  )
}
