import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { normalizeLei, validateLeiFormat, fetchGleif, isActive, isExpiringSoon, NotFoundError, ServiceUnavailableError } from "@/lib/lei";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";
import type { LeiResult, GleifRecord } from "@/lib/types";

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
  const cached = await cacheGet<LeiResult>(cacheKey);
  if (cached) {
    const payload: LeiResult = cached.valid ? { ...cached, cached: true } : cached;
    const res = NextResponse.json(payload, { status: 200 });
    return withRateHeaders(res, rl, "HIT");
  }

  try {
    const record: GleifRecord = await fetchGleif(lei);
    const active = isActive(record.entity_status, record.registration_status);
    const expires_soon = isExpiringSoon(record.next_renewal_date);

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
      verified_at: new Date().toISOString(),
    };

    await cacheSet(cacheKey, result, VALID_TTL);
    const res = NextResponse.json(result, { status: 200 });
    return withRateHeaders(res, rl, "MISS");
  } catch (err) {
    if (err instanceof NotFoundError) {
      const result: LeiResult = {
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
