# RapidAPI Listing — LEI Validator Pro

Copy-paste into RapidAPI Studio. Follows same structure as EORI Validator Pro listing.

---

## Core fields

| Field | Value |
|---|---|
| **API Name** | `LEI Validator Pro` |
| **Category** | Finance → Compliance |
| **Base URL** | `https://lei-validator.vercel.app/api/v1` |
| **Proxy Secret** | `17113fe7-f2b8-4f5a-8fff-1eec31c0a7e6` |
| **Health URL (monitoring)** | `https://lei-validator.vercel.app/api/health` |
| **Privacy URL** | `https://raw.githubusercontent.com/arrijr/lei-validator/main/PRIVACY.md` |
| **Terms URL** | `https://raw.githubusercontent.com/arrijr/lei-validator/main/TERMS.md` |
| **OpenAPI** | `https://raw.githubusercontent.com/arrijr/lei-validator/main/openapi.yaml` |
| **Logo** | `public/logo.svg` |

---

## Studio → Security → Secret Headers & Parameters

Add **one row** — injects the Proxy Secret on every gateway request so our middleware accepts the call:

| Name | Value | Type | Description |
|---|---|---|---|
| `X-RapidAPI-Proxy-Secret` | `17113fe7-f2b8-4f5a-8fff-1eec31c0a7e6` | Header | Auth between RapidAPI gateway and Vercel origin |

Without this row every request returns `403 FORBIDDEN` from our middleware.

> ⚠️ **Do not put this in Transformations.** That dialog has a `Key` field expecting dotted-path format (`request.header.data`) and will reject plain header names with "Invalid format". Use the Secret Headers table above.

## Studio → Security → Transformations

**None required.** Base URL already contains `/api/v1`, so user-facing paths like `/validate` map 1:1 to origin `/api/v1/validate`. Leave the table empty.

---

## Tagline (max 60 chars)

```
Validate LEI numbers with company details from GLEIF
```
(52 chars ✓)

---

## Short description (max 160 chars)

```
Validate LEI numbers against GLEIF. Returns company name, entity status, renewal date. MiFID II, EMIR, KYB. Single + batch (up to 50). 24h cache.
```
(146 chars ✓ — keywords front-loaded: "Validate", "LEI", "GLEIF", "MiFID II", "EMIR", "KYB")

---

## Long description (Overview tab)

> Paste into Studio → Settings → Description. Keywords woven in naturally — no separate Tags field exists on RapidAPI, search ranking comes from the description text + title.

```markdown
# LEI Validator Pro — Legal Entity Identifier Validation API

**LEI Validator Pro** is a dedicated REST API to validate Legal Entity Identifier (LEI) numbers against the official **GLEIF** (Global Legal Entity Identifier Foundation) registry. One call returns company name, country, jurisdiction, entity status, registration status, renewal date — normalized to clean, flat JSON. No JSON:API complexity, no wrapper code needed.

LEIs are required by **MiFID II**, **MiFIR**, and **EMIR** for every securities transaction and derivatives report in the EU and UK. Without a valid LEI, trades cannot be executed — "No LEI, No Trade". This API handles LEI validation for **KYB (Know Your Business)** workflows, compliance checks, and trade-system integrations.

## Why developers choose this API

- **Clean JSON output** — GLEIF's native API returns JSON:API format, a deeply nested structure most developers find painful. We normalize it to a flat, readable object in a single call.
- **`is_active` boolean** — true only when entity_status = ACTIVE **and** registration_status = ISSUED. Catches entities that exist in GLEIF but are lapsed, merged, or retired — a distinction the raw GLEIF API requires you to implement yourself.
- **`expires_soon` flag** — LEIs must be renewed annually. We flag any LEI expiring within 90 days, the industry-standard renewal reminder window. Catch lapsing LEIs before your next trade fails.
- **Full company data** — legal name, country, jurisdiction, legal form, registered address, headquarters address — all from one call.
- **Batch validation** — validate up to 50 LEIs in parallel (Basic: 10, Pro/Business: 50). Results returned in input order.
- **24-hour cache** — GLEIF has a 60 req/min rate limit. Our cache protects you from hitting it and keeps responses fast on repeated lookups.
- **Predictable error codes** — `INVALID_FORMAT`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`, `BATCH_LIMIT_EXCEEDED`. Stable, machine-readable, no ambiguous strings.

## Common use cases

- **MiFID II / MiFIR trade reporting** — validate counterparty LEIs before submitting trade reports to ARM/NCA. Block transactions with lapsed or non-existent LEIs.
- **EMIR derivatives reporting** — validate LEIs for both counterparties on OTC derivative trades before ESMA reporting.
- **KYB (Know Your Business) onboarding** — verify entity existence, status, and legal name during business customer onboarding in fintech and banking platforms.
- **Asset management & prime brokerage** — nightly batch validation of counterparty LEI books. Flag LEIs expiring within 90 days before settlement fails.
- **RegTech SaaS** — embed LEI validation into compliance dashboards, reporting tools, and entity management systems.
- **ERP & data quality** — validate and enrich entity master data with official GLEIF company names, countries, and legal forms.

## Endpoints

### `POST /validate` — validate a single LEI

Request body: `{ "lei": "5493001KJTIIGC8Y1R12" }`. Spaces are ignored and input is auto-uppercased. Returns `valid`, `active`, `expires_soon`, company name, country, jurisdiction, entity and registration status, and renewal date.

### `POST /validate/batch` — validate up to 50 LEIs

Request body: `{ "leis": ["5493001KJTIIGC8Y1R12", "2138003AKXNLBMND5W28"] }`. Returns `results` array in input order plus aggregate `valid_count`, `invalid_count`, `expiring_soon_count`. Batch size caps by plan: Basic 10, Pro/Business 50. Not available on Free.

### `GET /lookup/{lei}` — full company data with addresses

Returns complete entity record including `legal_address` and `headquarters_address` objects. Use this when you need full entity data rather than just a validity check. Returns `404` when the LEI is not found (unlike `/validate` which returns `200` with `valid: false`).

### `GET /api/health`

Returns `{ "status": "ok", "gleif_reachable": true }`. Unguarded — no RapidAPI key required.

## Response format

- **JSON** responses, UTF-8, `Content-Type: application/json`
- **Country codes**: ISO 3166-1 alpha-2 (e.g. `DE`, `US`, `GB`)
- **Dates**: ISO 8601 date format (`YYYY-MM-DD`)
- **Timestamps**: ISO 8601 UTC (e.g. `2026-04-20T10:00:00Z`)
- **Headers**: every response includes `X-Cache: HIT|MISS`, `X-RateLimit-Remaining`, `X-RateLimit-Limit`
- **Errors**: `{ "error": string, "code": string }` with stable machine-readable codes

## Data source

All data comes from **GLEIF** (Global Legal Entity Identifier Foundation), the official international body that issues and maintains LEIs globally. GLEIF data is open and public under their open data policy. There are currently **2.6+ million active LEIs** worldwide, growing at ~11% per year.

## FAQ

**What is an LEI?** A Legal Entity Identifier is a 20-character alphanumeric code that uniquely identifies legal entities participating in financial transactions. Governed by ISO 17442.

**Why is LEI validation needed?** MiFID II/MiFIR requires a valid LEI for every securities transaction. EMIR requires LEIs for OTC derivatives reporting. Without a valid, non-lapsed LEI, trades are blocked — "No LEI, No Trade".

**What does `active: false` mean?** Either the entity's status is not ACTIVE (e.g. INACTIVE, ANNULLED) or the registration status is not ISSUED (e.g. LAPSED, RETIRED, MERGED). An LEI can exist in GLEIF but still be unusable for trading.

**How fast is the API?** Cached responses return in under 30 ms. Uncached responses take 200–600 ms depending on GLEIF backend latency.

**What if GLEIF is down?** We serve cached valid responses (24h TTL) during GLEIF outages. If the LEI isn't cached and GLEIF is unreachable, we return `503 SERVICE_UNAVAILABLE`.

**Is the `expires_soon` flag reliable?** Yes — we compare `next_renewal_date` to the current date server-side on every response (including cache hits). An LEI renewed yesterday will no longer show `expires_soon: true` on the next call.

**Is this API legally authoritative for compliance?** No. For legally binding regulatory filings always validate against GLEIF directly. See our Terms of Service for full data-accuracy and "no financial/compliance advice" disclaimer.

## Keywords

LEI validation, LEI lookup API, legal entity identifier API, validate LEI number, LEI number check, GLEIF API wrapper, LEI validator, MiFID II compliance API, EMIR LEI validation, KYB API, entity verification API, legal entity verification, company validation API, LEI batch validation, LEI status check, MiFIR trade reporting, KYB verification, financial entity lookup, LEI REST API, regulatory compliance API.

## Disclaimer

LEI data is retrieved from the GLEIF REST API. Results are cached for 24h on valid responses and 1h on invalid responses. A `valid: true` response means the LEI was recognized by GLEIF at the time of last fetch — it does not constitute financial, legal, or regulatory advice. For legally binding trade reporting always validate against GLEIF directly. See TERMS.md for full liability terms.
```

---

## Pricing tiers (Studio → Plans)

| Tier | Price/mo | Requests/mo | Batch size | Overage |
|---|---|---|---|---|
| **BASIC (Free)** | $0 | 100 | ❌ | Hard cap |
| **PRO** | $9 | 1,000 | 10 max | $5 / 1k req |
| **ULTRA** | $29 | 10,000 | 50 max | $5 / 1k req |
| **MEGA** | $99 | 100,000 | 50 max | $5 / 1k req |

Rate limit all tiers: 10 req/sec.

**Plan descriptions:**
- Free: Test the API with no commitment. No credit card required.
- Basic: For indie developers and small fintech tools. Includes batch (up to 10).
- Pro: For RegTech SaaS and compliance tools. Batch up to 50 LEIs.
- Business: For banks, asset managers, and KYB platforms. High-volume batch.

---

## Code examples

### cURL

```bash
# Single validation
curl -X POST 'https://lei-validator-pro.p.rapidapi.com/validate' \
  -H 'Content-Type: application/json' \
  -H 'x-rapidapi-host: lei-validator-pro.p.rapidapi.com' \
  -H 'x-rapidapi-key: YOUR_RAPIDAPI_KEY' \
  -d '{"lei":"5493001KJTIIGC8Y1R12"}'
```

### JavaScript (fetch)

```js
const res = await fetch(
  'https://lei-validator-pro.p.rapidapi.com/validate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'lei-validator-pro.p.rapidapi.com',
      'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY',
    },
    body: JSON.stringify({ lei: '5493001KJTIIGC8Y1R12' }),
  }
);
const data = await res.json();
// { valid: true, active: true, legal_name: 'Bloomberg Finance L.P.', expires_soon: false, ... }
console.log(data.valid, data.legal_name, data.expires_soon);
```

### Python (requests)

```python
import requests

r = requests.post(
    "https://lei-validator-pro.p.rapidapi.com/validate",
    headers={
        "Content-Type": "application/json",
        "x-rapidapi-host": "lei-validator-pro.p.rapidapi.com",
        "x-rapidapi-key": "YOUR_RAPIDAPI_KEY",
    },
    json={"lei": "5493001KJTIIGC8Y1R12"},
)
data = r.json()
print(data["valid"], data["legal_name"], data["expires_soon"])
# True  Bloomberg Finance L.P.  False
```

### Python (batch)

```python
import requests

r = requests.post(
    "https://lei-validator-pro.p.rapidapi.com/validate/batch",
    headers={
        "Content-Type": "application/json",
        "x-rapidapi-host": "lei-validator-pro.p.rapidapi.com",
        "x-rapidapi-key": "YOUR_RAPIDAPI_KEY",
    },
    json={"leis": ["5493001KJTIIGC8Y1R12", "2138003AKXNLBMND5W28", "INVALID"]},
)
data = r.json()
print(f"{data['valid_count']} valid / {data['invalid_count']} invalid / {data['expiring_soon_count']} expiring")
for item in data["results"]:
    print(("✓" if item["valid"] else "✗"), item.get("lei"), item.get("legal_name", item.get("error_code")))
```

### JavaScript (full lookup)

```js
const lei = '5493001KJTIIGC8Y1R12';
const res = await fetch(
  `https://lei-validator-pro.p.rapidapi.com/lookup/${lei}`,
  {
    headers: {
      'x-rapidapi-host': 'lei-validator-pro.p.rapidapi.com',
      'x-rapidapi-key': 'YOUR_RAPIDAPI_KEY',
    },
  }
);
const data = await res.json();
// Full company data incl. legal_address + headquarters_address
console.log(data.legal_name, data.legal_address.city, data.legal_address.country);
```

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_FORMAT` | 200 (`valid:false`) | LEI is not 20 alphanumeric characters |
| `NOT_FOUND` | 200 on /validate, 404 on /lookup | Format correct but not in GLEIF |
| `SERVICE_UNAVAILABLE` | 503 | GLEIF temporarily unreachable |
| `BATCH_LIMIT_EXCEEDED` | 422 | Batch size exceeds plan limit |
| `BATCH_NOT_ALLOWED` | 422 | Free plan — upgrade for batch |
| `RATE_LIMIT_EXCEEDED` | 429 | Monthly quota hit |
| `FORBIDDEN` | 403 | Direct request bypassing RapidAPI gateway |

---

## Studio Tests (free plan: 2 max)

> RapidAPI Studio free tier allows only 2 active tests per API. The two below are mandatory.

### Test 1: Health (every 15 min)

| Field | Value |
|---|---|
| Name | `Health` |
| Location | Frankfurt |
| Step 1 | HTTP GET |
| URL | `https://lei-validator.vercel.app/api/health` |
| Variable | `health` |
| Headers | *(none — health is unguarded)* |
| Step 2 | Assert Equals |
| Expression | `health.data.status` |
| Value | `ok` |
| Schedule | every 15 min |

### Test 2: Format rejection (every 60 min)

Deterministic — tests guard + middleware + format-validation logic with no GLEIF dependency.

| Field | Value |
|---|---|
| Name | `Format-Reject` |
| Location | Frankfurt |
| Step 1 | HTTP POST |
| URL | `https://lei-validator.vercel.app/api/v1/validate` |
| Variable | `fmt` |
| Headers | `X-RapidAPI-Proxy-Secret: 17113fe7-f2b8-4f5a-8fff-1eec31c0a7e6`<br>`Content-Type: application/json` |
| Body (JSON) | `{"lei":"BAD"}` |
| Step 2 | Assert Equals |
| Expression | `fmt.data.error_code` |
| Value | `INVALID_FORMAT` |
| Schedule | every 60 min |

**Why this test and not a live GLEIF validation?** A GLEIF outage would falsely fail a live happy-path test. A format-rejection test is deterministic and still exercises: (1) middleware guard with injected Proxy Secret, (2) body parsing, (3) format-validation logic, (4) stable error-code contract.

**Studio assertion syntax reminder:** Expression field is entered **without `{{ }}` braces**. Body of the response lives under `<var>.data.<field>`, not `<var>.body.<field>`. `<var>.status` is the HTTP status code, not a body field.

---

## Go-Live Checklist

- [x] GitHub repo: `arrijr/lei-validator`
- [x] Vercel deployed: `https://lei-validator.vercel.app` (fra1, SSO off)
- [x] Env vars set (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RAPIDAPI_PROXY_SECRET`, `GLEIF_API_ENDPOINT`)
- [x] Proxy Secret Guard in middleware
- [x] README, PRIVACY, TERMS, openapi.yaml, logo.svg on `main`
- [ ] **RapidAPI listing created** — paste fields above into Studio
- [ ] **Secret Headers table** — `X-RapidAPI-Proxy-Secret` row present
- [ ] **Transformations table** — leave empty
- [ ] **Plans configured** — 4 tiers with correct request limits and batch sizes
- [ ] **Studio Test 1** — Health every 15 min
- [ ] **Studio Test 2** — Format-Reject every 60 min
- [ ] **Smoketest via RapidAPI Playground** — POST /validate with `5493001KJTIIGC8Y1R12` → 200 JSON
- [ ] **API published** on RapidAPI
