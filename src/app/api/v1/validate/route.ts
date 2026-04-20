import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { normalizeLei, validateLeiFormat, fetchGleif, isActive, isExpiringSoon, NotFoundError } from "@/lib/lei";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";
import { isCachedValid, type CachedLeiRecord, type LeiResult, type LeiLookupResponse, type InvalidLeiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TTL = 86400;
const INVALID_TTL = 3600;

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req.headers);
  if (!rl.success) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(400, "Invalid JSON body", "INVALID_JSON", rl);
  }

  const raw = (body as { lei?: unknown } | null)?.lei;
  if (typeof raw !== "string" || raw.length === 0) {
    return errorJson(400, "Missing 'lei' field", "INVALID_FORMAT", rl);
  }

  const lei = normalizeLei(raw);

  if (!validateLeiFormat(lei)) {
    const invalid: LeiResult = {
      valid: false,
      lei,
      error_code: "INVALID_FORMAT",
      error: "LEI must be exactly 20 alphanumeric characters",
    };
    const res = NextResponse.json(invalid, { status: 200 });
    return withRateHeaders(res, rl, "MISS");
  }

  const cacheKey = `lei:${lei}`;
  const cached = await cacheGet<CachedLeiRecord>(cacheKey);
  if (cached) {
    let payload: LeiResult;
    if (isCachedValid(cached)) {
      payload = buildValidateResponse(cached, true);
    } else {
      payload = cached;
    }
    const res = NextResponse.json(payload, { status: 200 });
    return withRateHeaders(res, rl, "HIT");
  }

  try {
    const record = await fetchGleif(lei);
    const active = isActive(record.entity_status, record.registration_status);
    const expires_soon = isExpiringSoon(record.next_renewal_date);
    const verified_at = new Date().toISOString();

    const cacheEntry: LeiLookupResponse = {
      ...record,
      expires_soon,
      source: "GLEIF",
      cached: false,
      verified_at,
    };

    await cacheSet(cacheKey, cacheEntry, VALID_TTL);

    const result: LeiResult = {
      valid: true,
      active,
      lei: record.lei,
      legal_name: record.legal_name,
      country: record.country,
      jurisdiction: record.jurisdiction,
      entity_status: record.entity_status,
      registration_status: record.registration_status,
      next_renewal_date: record.next_renewal_date,
      expires_soon,
      source: "GLEIF",
      cached: false,
      verified_at,
    };

    const res = NextResponse.json(result, { status: 200 });
    return withRateHeaders(res, rl, "MISS");
  } catch (err) {
    if (err instanceof NotFoundError) {
      const result: InvalidLeiResponse = {
        valid: false,
        lei,
        error_code: "NOT_FOUND",
        error: "LEI not found in GLEIF database",
      };
      await cacheSet(cacheKey, result, INVALID_TTL);
      const res = NextResponse.json(result, { status: 200 });
      return withRateHeaders(res, rl, "MISS");
    }

    const res = NextResponse.json(
      { error: "GLEIF database temporarily unavailable", code: "SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
    return withRateHeaders(res, rl, "MISS");
  }
}

function buildValidateResponse(r: LeiLookupResponse, cached: boolean): LeiResult {
  return {
    valid: true,
    active: isActive(r.entity_status, r.registration_status),
    lei: r.lei,
    legal_name: r.legal_name,
    country: r.country,
    jurisdiction: r.jurisdiction,
    entity_status: r.entity_status,
    registration_status: r.registration_status,
    next_renewal_date: r.next_renewal_date,
    expires_soon: r.expires_soon,
    source: "GLEIF",
    cached,
    verified_at: r.verified_at,
  };
}
