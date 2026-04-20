# Privacy Policy — LEI Validator Pro

**Last updated:** 2026-04-20
**Provider:** Arthur Richelhof (arrijr)
**Contact:** richelhofarthur@gmail.com

---

## What data we collect

This API validates Legal Entity Identifier (LEI) numbers against the GLEIF registry. We collect **the minimum data required to operate the service**:

| Data | Purpose | Retention |
|---|---|---|
| IP address | Rate limiting (sliding window) | 30 days (rolling window only) |
| RapidAPI user identifier (`x-rapidapi-user` header) | Rate limiting per subscription | 30 days (rolling window only) |
| RapidAPI proxy secret header | Authentication | Not stored |
| Submitted LEI number | Validation + short-term caching | 24 h (valid) / 1 h (invalid) |
| Company data returned by GLEIF | Caching of upstream response | 24 h |

We do **not** collect, log, or persist:
- Full request bodies or response bodies beyond the cache entry above
- Cookies or tracking identifiers
- Any data beyond the retention windows listed above

## How we process data

- Cache and rate-limiting state are stored in **Upstash Redis** (EU region, `fra1`) with automatic expiry.
- Infrastructure is hosted on **Vercel** (EU region, `fra1`) and **Upstash** (EU).
- No data leaves the European Union.
- No analytics, no tracking pixels, no third-party scripts.

## Data sources

Validation data is retrieved from the publicly accessible GLEIF REST API:
- **GLEIF (Global Legal Entity Identifier Foundation):** `https://api.gleif.org/api/v1/`

LEI data published by GLEIF is public record under an open data policy. We do not modify, enrich, or combine this data with any other source.

## Legal basis (GDPR)

- **Rate limiting (IP / user ID):** legitimate interest (Art. 6(1)(f) GDPR) — protecting the service from abuse.
- **Caching of LEI lookups:** legitimate interest (Art. 6(1)(f) GDPR) — ensuring availability when the upstream GLEIF database is temporarily unreachable, and reducing load on public infrastructure.

Company names and addresses cached by the Service are already published by GLEIF as public records of legal entities.

## Your rights

Because data is purged automatically within the retention windows listed above and is not linked to a natural person, rights of access, rectification, erasure, and portability are limited. If you believe a specific cache entry should be purged, contact us at richelhofarthur@gmail.com and we will clear it within 72 hours.

## Subprocessors

- **RapidAPI (RapidAPI Inc., USA)** — API gateway; see RapidAPI's own privacy policy.
- **Vercel Inc. (USA, EU region)** — hosting.
- **Upstash Inc. (EU region)** — cache and rate-limiting storage.
- **GLEIF (Global Legal Entity Identifier Foundation, Switzerland)** — upstream LEI data source.

## Changes

Material changes will be reflected in this document and the `Last updated` date.

## Contact

Arthur Richelhof — richelhofarthur@gmail.com
