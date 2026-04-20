import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { normalizeLei, validateLeiFormat, fetchGleif, isExpiringSoon, NotFoundError } from "@/lib/lei";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";
import type { LeiLookupResponse, LeiResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TTL = 86400;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lei: string }> },
) {
  const rl = await checkRateLimit(req.headers);
  if (!rl.success) return rateLimitedResponse(rl);

  const { lei: rawLei } = await params;
  const lei = normalizeLei(rawLei);

  if (!validateLeiFormat(lei)) {
    return errorJson(400, "LEI must be exactly 20 alphanumeric characters", "INVALID_FORMAT", rl, "MISS");
  }

  const cacheKey = `lei:${lei}`;
  const cached = await cacheGet<LeiResult>(cacheKey);
  if (cached) {
    if (!cached.valid) {
      const res = NextResponse.json(
        { error: "LEI not found in GLEIF database", code: "NOT_FOUND" },
        { status: 404 },
      );
      return withRateHeaders(res, rl, "HIT");
    }
    const lookup = buildLookupFromValid(cached, true);
    const res = NextResponse.json(lookup, { status: 200 });
    return withRateHeaders(res, rl, "HIT");
  }

  try {
    const record = await fetchGleif(lei);
    const expires_soon = isExpiringSoon(record.next_renewal_date);

    const validateResult: LeiResult = {
      valid: true,
      active: record.entity_status === "ACTIVE" && record.registration_status === "ISSUED",
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
      verified_at: new Date().toISOString(),
    };
    await cacheSet(cacheKey, validateResult, VALID_TTL);

    const lookup: LeiLookupResponse = {
      ...record,
      expires_soon,
      source: "GLEIF",
      cached: false,
      verified_at: validateResult.verified_at,
    };

    const res = NextResponse.json(lookup, { status: 200 });
    return withRateHeaders(res, rl, "MISS");
  } catch (err) {
    if (err instanceof NotFoundError) {
      const res = NextResponse.json(
        { error: "LEI not found in GLEIF database", code: "NOT_FOUND" },
        { status: 404 },
      );
      return withRateHeaders(res, rl, "MISS");
    }
    const res = NextResponse.json(
      { error: "GLEIF database temporarily unavailable", code: "SERVICE_UNAVAILABLE" },
      { status: 503 },
    );
    return withRateHeaders(res, rl, "MISS");
  }
}

function buildLookupFromValid(r: LeiResult, cached: boolean): LeiLookupResponse {
  if (!r.valid) throw new Error("called with invalid result");
  return {
    lei: r.lei,
    legal_name: r.legal_name,
    country: r.country,
    jurisdiction: r.jurisdiction,
    legal_form: null,
    entity_status: r.entity_status,
    registration_status: r.registration_status,
    next_renewal_date: r.next_renewal_date,
    expires_soon: r.expires_soon,
    legal_address: { street: null, city: null, region: null, postal_code: null, country: r.country },
    headquarters_address: { street: null, city: null, region: null, postal_code: null, country: r.country },
    source: "GLEIF",
    cached,
    verified_at: r.verified_at,
  };
}
