# Prompt für Claude Code — LEI Validator Pro

Bitte lies zuerst diese Dateien vollständig durch, bevor du anfängst:
- `C:\Users\Arthur\Documents\Coding\APIs\LESSONS_LEARNED.md` ← **Pflichtlektüre: bekannte Probleme + Lösungen**
- `C:\Users\Arthur\Documents\Coding\APIs\lei-validator\KICKOFF.md`
- `C:\Users\Arthur\Documents\Coding\APIs\lei-validator\openapi.yaml`
- `C:\Users\Arthur\Documents\Coding\APIs\CLAUDE.md` (Projekt-Standards, Logo-System, Boilerplate)

---

## Aufgabe

Baue die **LEI Validator Pro API** als Next.js App (gleicher Stack wie das bestehende `eori-validator` Projekt).

**Orientiere dich am bestehenden Projekt:** `C:\Users\Arthur\Documents\Coding\APIs\eori-validator\`  
Gleiche Ordnerstruktur, gleiche Patterns, gleiche Boilerplate (Lazy Redis, RapidAPI Proxy Secret Guard, Health Check).

---

## Stack
- Next.js 15+ mit App Router, TypeScript
- Upstash Redis (Lazy-Initialisierung + 24h Caching — NICHT `Redis.fromEnv()` auf Modulebene!)
- GLEIF REST API als Datenquelle (öffentlich, kein API-Key nötig)
- Vercel deployment, Region: `fra1`

---

## GLEIF API Details

- **Endpoint:** `GET https://api.gleif.org/api/v1/lei-records/{lei}`
- **Auth:** Keine — öffentliche API
- **Rate Limit:** 60 req/min → deshalb 24h Cache
- **Response-Format:** JSON:API (`application/vnd.api+json`) — muss zu flachem JSON normalisiert werden

### Relevante Felder aus GLEIF Response:
```
data.attributes.entity.legalName.name       → legal_name
data.attributes.entity.status               → entity_status (ACTIVE/INACTIVE/ANNULLED)
data.attributes.entity.jurisdiction         → jurisdiction
data.attributes.entity.legalAddress         → legal_address
data.attributes.entity.headquartersAddress  → headquarters_address
data.attributes.entity.legalForm.id         → legal_form
data.attributes.registration.status        → registration_status (ISSUED/LAPSED/RETIRED/...)
data.attributes.registration.nextRenewalDate → next_renewal_date
```

### Cache-Strategie
- Cache-Key: `lei:{normalizedLei}` (uppercase, Leerzeichen entfernt)
- Valide + aktive LEIs: TTL 24h (86400s)
- Nicht gefundene LEIs: TTL 1h (3600s)
- Header: `X-Cache: HIT` oder `MISS`

---

## LEI-Format

- Genau 20 alphanumerische Zeichen
- Normalisierung vor Verarbeitung: Leerzeichen entfernen, uppercase
- Format-Check VOR dem GLEIF API-Call (spart Requests)
- `active`: true NUR wenn `entity_status = "ACTIVE"` UND `registration_status = "ISSUED"`
- `expires_soon`: true wenn `next_renewal_date` < 90 Tage in der Zukunft

---

## Endpoints (exakt nach openapi.yaml)

### 1. `POST /api/v1/validate` — Single LEI
- Input: `{ "lei": "5493001KJTIIGC8Y1R12" }`
- Response valid: `{ valid, active, lei, legal_name, country, jurisdiction, entity_status, registration_status, next_renewal_date, expires_soon, source, cached, verified_at }`
- Response invalid Format: `{ valid: false, lei, error_code: "INVALID_FORMAT", error }`
- Response nicht gefunden: `{ valid: false, lei, error_code: "NOT_FOUND", error }`
- Error-Codes: `INVALID_FORMAT`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`

### 2. `POST /api/v1/validate/batch` — Batch (bis 50 LEIs)
- Input: `{ "leis": ["5493001KJTIIGC8Y1R12", "..."] }`
- Batch-Limit je nach Tier: Free = 0 (kein Batch), Basic = 10, Pro/Business = 50
- Tier aus `x-rapidapi-subscription` Header lesen
- Response: `{ results: [...], total, valid_count, invalid_count, expiring_soon_count }`
- Bei Überschreitung: 422 `BATCH_LIMIT_EXCEEDED`
- Bei fehlendem Tier-Zugang: 422 `BATCH_NOT_AVAILABLE`

### 3. `GET /api/v1/lookup/{lei}` — Vollständige Firmendaten
- Gibt alle GLEIF-Felder zurück inkl. `legal_address` + `headquarters_address`
- 404 wenn nicht gefunden, 400 wenn ungültiges Format
- Ebenfalls gecacht (24h)

### 4. `GET /api/health` — Health Check
- Prüft ob GLEIF API erreichbar ist: `GET https://api.gleif.org/api/v1/lei-records/5493001KJTIIGC8Y1R12`
- Response: `{ status: "ok", gleif_reachable: true/false, timestamp }`
- Bei GLEIF nicht erreichbar: status weiterhin "ok" (unsere API läuft), aber `gleif_reachable: false`

---

## Pflicht-Regeln

- **Lazy Redis-Initialisierung** — Redis NICHT als globale Variable (siehe LESSONS_LEARNED.md)
- **Vercel env vars mit `printf '%s'`** setzen, NIEMALS mit `echo` (siehe LESSONS_LEARNED.md)
- **Vercel SSO Protection deaktivieren** nach erstem Deploy (siehe LESSONS_LEARNED.md)
- **RapidAPI Proxy Secret Guard** — `x-rapidapi-proxy-secret` Header auf allen `/api/v1/*` Routes prüfen
- **`X-RateLimit-Remaining`** + **`X-Cache: HIT|MISS`** Header in jeder Response
- **Konsistente Error-Responses:** immer `{ error: string, code: string }`
- **Rate Limiting** via `@upstash/ratelimit` (sliding window)
- **GLEIF 503 Fallback:** wenn GLEIF nicht erreichbar → 503 mit `SERVICE_UNAVAILABLE`, NIEMALS crashen
- **Batch-Tier-Check:** `x-rapidapi-subscription` Header auswerten (Free = kein Batch)
- **Logo:** `public/logo.svg` — 120×120px, `rx="24"`, Hintergrund `#0F172A`, Akzent `#FACC15`, Text `#FFFFFF`, Kürzel `LEI`
- **README.md sofort ersetzen** — kein create-next-app Default stehen lassen

---

## Environment Variables (müssen in Vercel gesetzt werden)

```
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RAPIDAPI_PROXY_SECRET
GLEIF_API_ENDPOINT=https://api.gleif.org/api/v1  (optional, für lokales Überschreiben)
```

---

## Projektordner

`C:\Users\Arthur\Documents\Coding\APIs\lei-validator\`

KICKOFF.md und openapi.yaml liegen bereits dort. Das Next.js Projekt direkt in diesem Ordner scaffolden.

---

## Wenn du fertig bist

1. Smoketest: ohne `x-rapidapi-proxy-secret` Header → 403, mit Header → 200
2. Test mit echter LEI: `5493001KJTIIGC8Y1R12` (Bloomberg Finance L.P.) → sollte `valid: true, active: true` liefern
3. Test mit ungültiger LEI: `INVALID123` → sollte `valid: false, error_code: "INVALID_FORMAT"` liefern
4. Ruf `/api-review` auf — Security, Error Handling, Breaking Changes prüfen
5. Sag Bescheid, dann machen wir das RapidAPI Listing mit `/rapidapi-listing`

**Wenn ein neues Problem auftritt das in LESSONS_LEARNED.md noch nicht steht:**  
Dokumentiere es dort direkt — dann wird es beim nächsten API-Build automatisch berücksichtigt.
