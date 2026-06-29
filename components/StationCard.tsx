'use client'

import { useState } from 'react'
import { Station } from '@/lib/supabase'
import { ExternalLink, ChevronDown, ChevronUp, Pencil, Save, X } from 'lucide-react'

interface Props {
  station: Station
  onAktualisiert: () => void
}

export default function StationCard({ station, onAktualisiert }: Props) {
  const [offen, setOffen] = useState(false)
  const [bearbeiten, setBearbeiten] = useState(false)
  const [ticketId, setTicketId] = useState(station.zoho_ticket_id ?? '')
  const [ticketUrl, setTicketUrl] = useState(station.zoho_ticket_url ?? '')
  const [notizen, setNotizen] = useState(station.notizen ?? '')
  const [laden, setLaden] = useState(false)

  async function speichern() {
    setLaden(true)
    await fetch(`/api/stationen/${station.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zoho_ticket_id: ticketId || null,
        zoho_ticket_url: ticketUrl || null,
        notizen: notizen || null,
      }),
    })
    setBearbeiten(false)
    setLaden(false)
    onAktualisiert()
  }

  const istOffline = station.meldungstyp === 'offline'

  return (
    <div className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Kopfzeile */}
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                istOffline
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {istOffline ? 'Offline' : 'Störung'}
            </span>
            {station.zoho_ticket_id && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                Ticket #{station.zoho_ticket_id}
              </span>
            )}
          </div>
          <div className="font-semibold text-gray-900 truncate">{station.kundenname ?? '–'}</div>
          <div className="text-sm text-gray-500 mt-0.5">{station.standort ?? station.bezeichnung ?? '–'}</div>
          <div className="text-xs font-mono text-gray-400 mt-1">{station.interne_id}</div>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {station.zoho_ticket_url && (
            <a
              href={station.zoho_ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
              title="Zoho Ticket öffnen"
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={() => setOffen(!offen)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
          >
            {offen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Ladepunkte als Tags */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        {station.ladepunkte?.map((lp) => (
          <span key={lp.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
            {lp.evse_id ?? '–'}
            {lp.prioritaet && lp.prioritaet !== '–' && (
              <span className="ml-1 text-gray-400">{lp.prioritaet}</span>
            )}
          </span>
        ))}
      </div>

      {/* Aufgeklappter Bereich */}
      {offen && (
        <div className="border-t px-4 py-4 bg-gray-50 space-y-3">
          {!bearbeiten ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Zoho Ticket-ID</div>
                  <div className="text-gray-700">{station.zoho_ticket_id ?? '–'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Erstellt am</div>
                  <div className="text-gray-700">
                    {new Date(station.erstellt_am).toLocaleDateString('de-DE')}
                  </div>
                </div>
              </div>
              {station.notizen && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">Notizen</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{station.notizen}</div>
                </div>
              )}
              <button
                onClick={() => setBearbeiten(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
              >
                <Pencil size={13} />
                Bearbeiten
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Zoho Ticket-ID</label>
                <input
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="z. B. 12345"
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Zoho Ticket-URL</label>
                <input
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  placeholder="https://desk.zoho.eu/..."
                  className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notizen</label>
                <textarea
                  value={notizen}
                  onChange={(e) => setNotizen(e.target.value)}
                  rows={3}
                  className="w-full border rounded px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={speichern}
                  disabled={laden}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={13} />
                  Speichern
                </button>
                <button
                  onClick={() => setBearbeiten(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100"
                >
                  <X size={13} />
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
