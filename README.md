# Ladestation Tracker

Internes Tool zur Verwaltung defekter Ladestationen.

## Setup

### 1. Supabase Projekt anlegen
- Neues Projekt auf [supabase.com](https://supabase.com) erstellen
- SQL-Schema aus `supabase-schema.sql` im SQL-Editor ausführen

### 2. Umgebungsvariablen setzen
`.env.local` ausfüllen:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Lokal starten
```bash
npm install
npm run dev
```

### 4. Azure Deployment
```bash
# Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy --app-name ladestation-tracker
```

## Datenbank-Schema
Siehe `supabase-schema.sql`

## Features
- 📥 Rohdaten-Import mit KI-Parser (Claude)
- 🔄 Automatische Deduplizierung
- ⚡ Getrennte Listen: Offline / Störung
- 🔗 Zoho Desk Ticket-Verknüpfung
- 🔍 Volltext-Suche

<!-- build trigger 2 -->