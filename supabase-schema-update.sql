-- Felder für Irrelevant-Funktion hinzufügen
ALTER TABLE stationen ADD COLUMN IF NOT EXISTS irrelevant BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE stationen ADD COLUMN IF NOT EXISTS irrelevant_grund TEXT;
