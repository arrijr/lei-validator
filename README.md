# LEI Validator Pro

Validate Legal Entity Identifier (LEI) numbers against the official GLEIF database. Returns company name, entity status, renewal date, and full address data — normalized to clean JSON.

- 🏢 Company name, country, jurisdiction, legal form
- ✅ `is_active` boolean (entity ACTIVE + registration ISSUED)
- ⏰ `expires_soon` flag when renewal < 90 days away
- ⚡ Smart caching (24h valid, 1h invalid)
- 📦 Batch validation up to 50 LEIs (tier-based)

Required for MiFID II, EMIR, and KYB compliance workflows.

Published on [RapidAPI](https://rapidapi.com).

---

## Stack

- Next.js 15 (App Router)
- Vercel (serverless, region `fra1`)
- Upstash Redis (cache + rate limiting)
- GLEIF REST API (public, no auth required)

## Development

```bash
npm install
cp .env.example .env.local
# fill in Upstash credentials
npm run dev
```

Test with a known-valid LEI:

```bash
curl -X POST http://localhost:3000/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "x-rapidapi-proxy-secret: dev" \
  -d '{"lei": "5493001KJTIIGC8Y1R12"}'
```

## Endpoints

- `POST /api/v1/validate` — single LEI validation
- `POST /api/v1/validate/batch` — batch validation (tier-based)
- `GET /api/v1/lookup/{lei}` — full company data with addresses
- `GET /api/health` — service health (GLEIF reachability)

Full spec: [openapi.yaml](./openapi.yaml)

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Yes in prod | |
| `UPSTASH_REDIS_REST_TOKEN` | Yes in prod | |
| `RAPIDAPI_PROXY_SECRET` | Yes in prod | Rejects direct calls with 403 |
| `GLEIF_API_ENDPOINT` | No | Defaults to `https://api.gleif.org/api/v1` |

## Access

API is only accessible through RapidAPI. Direct requests are rejected with `403 FORBIDDEN`. Subscribe at [RapidAPI](https://rapidapi.com) to get a key.

## Legal

- [Privacy Policy](./PRIVACY.md)
- [Terms of Service](./TERMS.md)

Not financial, legal, or compliance advice. Validation reflects GLEIF registry state at query time.

## Deploy

```bash
vercel --prod
```
