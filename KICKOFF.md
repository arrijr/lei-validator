# LEI Validator Pro — Kickoff

**Status:** Planning
**Erstellt:** 2026-04-19
**Owner:** Arthur

---

## Phase 1: Markt-Validierung ✅

| Kriterium | Antwort | Status |
|---|---|---|
| Direkte Konkurrenten auf RapidAPI | Keine dedizierten LEI-Validator-APIs gefunden | ✅ |
| Popularity Score Top-Konkurrenten | Markt auf RapidAPI praktisch unbesetzt | ✅ |
| Klare Differenzierung möglich? | Ja — saubere REST API auf GLEIF-Basis, Firmendaten, Status-Check, Batch | ✅ |
| Zahlungsbereitschaft bewiesen? | Ja — MiFID II / EMIR Pflicht, Fintech/Banken zahlen für Compliance | ✅ |
| Rechtliche Risiken? | Niedrig — GLEIF-Daten sind öffentlich, MIT-Lizenz ähnlich | ✅ |

**Fazit:** Klares Go. Kein Konkurrent auf RapidAPI für diesen Use Case. Regulatorische Nachfrage durch MiFID II ("No LEI, No Trade"), EMIR (Derivate-Meldepflicht) und wachsendem KYB-Markt. Exakt gleiche Logik wie IBAN Validator und EORI Validator — bewährtes Muster, schnell zu bauen.

### Differenzierungsstrategie
1. **Sauberes JSON** — GLEIF API liefert JSON:API Format (komplex). Wir normalisieren zu flachem, entwicklerfreundlichem JSON
2. **is_valid + is_active Boolean** — Sofortantwort für Compliance-Checks ohne GLEIF-Komplexität zu verstehen
3. **expires_soon Flag** — LEIs müssen jährlich erneuert werden. Warnung wenn Ablauf < 90 Tage
4. **Firmendaten** — Name, Land, Rechtsform, Adressen, Status aus einem Call
5. **Batch-Validierung** — bis 50 LEIs auf einmal (Pro+)
6. **24h Caching** — GLEIF hat 60 req/min Limit, Cache schützt davor

### Warum die Zielgruppe zahlt
- **"No LEI, No Trade"** (MiFID II/MiFIR) — jede Wertpapiertransaktion erfordert valide LEI beider Parteien
- **EMIR** — EU-weite Derivate-Meldepflicht mit LEI
- **KYB (Know Your Business)** — Fintech-Onboarding erfordert Unternehmensverifikation
- **2,63 Mio aktive LEIs** weltweit, +11,5% YoY — wachsender Markt

---

## Phase 2: Technischer Ansatz

| Frage | Antwort |
|---|---|
| Was tut der Core-Endpoint? | LEI-Nummer → `{ valid, active, lei, legal_name, country, status, expires_soon }` |
| Externe Datenquelle | GLEIF REST API: `https://api.gleif.org/api/v1/` |
| Auth nötig? | **Nein** — öffentliche API, kein API-Key |
| Rate Limit GLEIF | 60 req/min — Mitigation: 24h Cache |
| Puppeteer nötig? | **Nein** |
| Datenbank nötig? | **Ja** — Upstash Redis für Caching + Rate Limiting |
| Async oder synchron? | Synchron |
| Geschätzte Response-Zeit | 200–500ms (extern), cached < 30ms |
| Größtes technisches Risiko | GLEIF API Instabilität — Mitigation: 24h Cache + 503 Fallback |

### GLEIF API Details
- **Endpoint:** `GET https://api.gleif.org/api/v1/lei-records/{lei}`
- **Response-Format:** JSON:API (`application/vnd.api+json`) — wir normalisieren zu flachem JSON
- **Key Fields:** `entity.legalName`, `entity.status` (ACTIVE/INACTIVE/ANNULLED), `entity.jurisdiction`, `entity.legalAddress`, `entity.headquartersAddress`, `entity.legalForm`, `registration.status` (ISSUED/LAPSED/RETIRED), `registration.nextRenewalDate`
- **LEI Format:** 20 Zeichen alphanumerisch — Prüfsumme nach ISO 17442 (MOD-97 ähnlich wie IBAN)

### Cache-Strategie
- Valide + aktive LEIs: TTL 24h
- Invalide / nicht gefundene LEIs: TTL 1h
- Key-Muster: `lei:{normalizedLei}`

---

## Phase 3: API-Design (Endpoints)

**4 Endpoints für v1:**

1. `POST /api/v1/validate` — Single LEI validieren
2. `POST /api/v1/validate/batch` — Bis 50 LEIs auf einmal
3. `GET /api/v1/lookup/{lei}` — Vollständige Firmendaten
4. `GET /api/health` — Health Check

### Request / Response Schema

```json
// POST /api/v1/validate
// Request
{ "lei": "5493001KJTIIGC8Y1R12" }

// Response 200 — valid & active
{
  "valid": true,
  "active": true,
  "lei": "5493001KJTIIGC8Y1R12",
  "legal_name": "Bloomberg Finance L.P.",
  "country": "US",
  "jurisdiction": "US-DE",
  "entity_status": "ACTIVE",
  "registration_status": "ISSUED",
  "next_renewal_date": "2027-01-25",
  "expires_soon": false,
  "source": "GLEIF",
  "cached": false,
  "verified_at": "2026-04-19T10:00:00Z"
}

// Response 200 — invalid format
{
  "valid": false,
  "lei": "INVALID123",
  "error_code": "INVALID_FORMAT",
  "error": "LEI must be exactly 20 alphanumeric characters"
}

// Response 200 — not found
{
  "valid": false,
  "lei": "00000000000000000000",
  "error_code": "NOT_FOUND",
  "error": "LEI not found in GLEIF database"
}

// GET /api/v1/lookup/5493001KJTIIGC8Y1R12
{
  "lei": "5493001KJTIIGC8Y1R12",
  "legal_name": "Bloomberg Finance L.P.",
  "country": "US",
  "jurisdiction": "US-DE",
  "legal_form": "Limited Partnership",
  "entity_status": "ACTIVE",
  "registration_status": "ISSUED",
  "next_renewal_date": "2027-01-25",
  "expires_soon": false,
  "legal_address": {
    "street": "251 Little Falls Drive",
    "city": "Wilmington",
    "region": "US-DE",
    "postal_code": "19808",
    "country": "US"
  },
  "headquarters_address": {
    "street": "731 Lexington Avenue",
    "city": "New York",
    "region": "US-NY",
    "postal_code": "10022",
    "country": "US"
  },
  "source": "GLEIF",
  "cached": false,
  "verified_at": "2026-04-19T10:00:00Z"
}
```

### Core-Regeln
- LEI normalisieren: Leerzeichen entfernen, uppercase
- Format-Check vor API-Call: genau 20 alphanumerische Zeichen
- `expires_soon`: true wenn `next_renewal_date` < 90 Tage in der Zukunft
- `active`: true nur wenn `entity_status = ACTIVE` UND `registration_status = ISSUED`
- Alle Error-Responses: `{ error: string, code: string }`
- Header `X-RateLimit-Remaining` + `X-Cache: HIT|MISS`
- Error-Codes: `INVALID_FORMAT`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`

---

## Phase 4: Pricing-Tiers

| Tier | Preis/Monat | Requests/Monat | Batch? | Zielgruppe |
|---|---|---|---|---|
| Free | $0 | 100 | ❌ | Testing |
| Basic | $9 | 1.000 | ✅ (max 10) | Indie-Entwickler, kleine Fintech-Tools |
| Pro | $29 | 10.000 | ✅ (max 50) | RegTech-SaaS, Compliance-Tools |
| Business | $99 | 100.000 | ✅ (max 50) | Banken, Asset Manager, KYB-Plattformen |

**Rationale:** Gleiche Tier-Struktur wie EORI Validator. Zielgruppe zahlt ähnlich — regulatorische Pflicht, kein Nice-to-have.

---

## Phase 5: RapidAPI Listing Vorbereitung

| Feld | Inhalt |
|---|---|
| API Name | **LEI Validator Pro** |
| Kategorie (RapidAPI) | Finance → Compliance / Banking |
| Tagline (max 60 Zeichen) | "Validate LEI numbers with company details from GLEIF" (52) |
| Zielgruppe | Fintech, Banken, RegTech, KYB-Plattformen, Compliance-Software |
| Hauptuse-Case | LEI-Nummer validieren + Firmendaten abrufen für MiFID II / EMIR Compliance |
| Primäre SEO-Keywords | `lei validation api`, `lei lookup api`, `lei number check`, `gleif api` |
| KYB/Compliance-Keywords | `kyb api`, `legal entity identifier api`, `mifid compliance api`, `entity verification api` |
| Differenzierung | Einzige dedizierte LEI Validator API auf RapidAPI — sauberes JSON, expires_soon Flag, Batch-Support |

### Search Behavior Insight

Viele Entwickler suchen **nicht** nach "LEI" — die kennen den Begriff oft gar nicht. Sie suchen nach:
- **`kyb api`** — Know Your Business, Fintech-Onboarding-Teams
- **`entity verification api`** — breiter gefasst, RegTech-Entwickler
- **`mifid compliance api`** — spezifische Regulatorik-Suche
- **`legal entity identifier api`** — ausgeschrieben, wenn sie den Begriff kennen
- **`company validation api`** — weit, aber relevant für KYB-Use-Cases
- **`gleif api`** — Entwickler die GLEIF kennen und einen Wrapper suchen

**Konsequenz für Listing:** Die Begriffe KYB, MiFID II, EMIR und "entity verification" müssen in der Description und den Tags prominent vorkommen — nicht nur "LEI". Der Tagline-Fokus bleibt auf LEI (höhere Conversion bei denen die es kennen), aber die Description öffnet für KYB-Suchen.

---

## Phase 6: Infrastruktur-Checkliste

- [ ] Neues GitHub-Repo `arrijr/lei-validator` anlegen
- [ ] Vercel-Projekt konnektieren (Region: `fra1`)
- [ ] Upstash Redis (Caching 24h + Rate Limiting)
- [ ] Environment Variables:
  - [ ] `UPSTASH_REDIS_REST_URL`
  - [ ] `UPSTASH_REDIS_REST_TOKEN`
  - [ ] `RAPIDAPI_PROXY_SECRET`
  - [ ] `GLEIF_API_ENDPOINT` (default: `https://api.gleif.org/api/v1`)
- [ ] Lazy Redis-Initialisierung
- [ ] RapidAPI Proxy Secret Guard
- [ ] Health Check mit GLEIF-Erreichbarkeit
- [ ] Logo: `public/logo.svg` — Kürzel `LEI`, gleiche Farben wie Portfolio

---

## Open Questions — alle beantwortet ✅

- [x] GLEIF API Lizenz für kommerzielle Nutzung? → Ja, öffentlich und kostenlos nutzbar
- [x] expires_soon Schwellwert? → 90 Tage (Standard in der Branche — LEI-Renewal wird 90 Tage vorher erinnert)
- [x] Batch in v1? → Ja, wie bei EORI (max 50)
- [x] lookup vs validate: Zwei Endpoints? → Ja — validate für schnellen Boolean-Check, lookup für vollständige Firmendaten

---

## Nächste Schritte

1. Next.js Projekt scaffolden
2. GLEIF API Integration testen (Spike: 30min — sollte trivial sein)
3. `/api-review` nach erstem funktionierenden Endpoint
4. `/rapidapi-listing` wenn MVP steht
5. `/api-launch` Checkliste vor Go-Live
