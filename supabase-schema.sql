-- ============================================
-- Ladestation Tracker – Supabase Schema
-- ============================================

-- Stationen (eine physische Ladestation)
CREATE TABLE stationen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interne_id TEXT NOT NULL UNIQUE,          -- Spalte 1 aus Export (Primärschlüssel für Deduplizierung)
  bezeichnung TEXT,                          -- Spalte 4 (interne Bezeichnung)
  kundenname TEXT,                           -- Spalte 5
  standort TEXT,                             -- Spalte 5 alternativ / manuell
  meldungstyp TEXT NOT NULL CHECK (meldungstyp IN ('offline', 'stoerung')),
  zoho_ticket_id TEXT,
  zoho_ticket_url TEXT,
  notizen TEXT,
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aktualisiert_am TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ladepunkte (EVSE – mehrere pro Station möglich)
CREATE TABLE ladepunkte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stationen(id) ON DELETE CASCADE,
  evse_id TEXT,                              -- Spalte 3 (5-stelliger Code, kann NULL sein)
  prioritaet TEXT,                           -- Mittel / Wichtig / Fehlerfrei etc.
  erstellt_am TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnelle Deduplizierung
CREATE INDEX idx_stationen_interne_id ON stationen(interne_id);
CREATE INDEX idx_ladepunkte_evse_id ON ladepunkte(evse_id);
CREATE INDEX idx_ladepunkte_station_id ON ladepunkte(station_id);

-- Trigger: aktualisiert_am automatisch setzen
CREATE OR REPLACE FUNCTION update_aktualisiert_am()
RETURNS TRIGGER AS $$
BEGIN
  NEW.aktualisiert_am = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stationen_aktualisiert_am
  BEFORE UPDATE ON stationen
  FOR EACH ROW EXECUTE FUNCTION update_aktualisiert_am();

