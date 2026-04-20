import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { normalizeLei, validateLeiFormat, fetchGleif, isExpiringSoon, NotFoundError } from "@/lib/lei";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";
import { isCachedValid, type CachedLeiRecord, type LeiLookupResponse, type InvalidLeiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TTL = 86400;
const INVALID_TTL = 3600;

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
  const cached = await cacheGet<CachedLeiRecord>(cacheKey);
  if (cached) {
    if (!isCachedValid(cached)) {
      const res = NextResponse.json(
        { error: "LEI not found in GLEIF database", code: "NOT_FOUND" },
        { status: 404 },
      );
      return withRateHeaders(res, rl, "HIT");
    }
    const payload: LeiLookupResponse = { ...cached, cached: true };
    const res = NextResponse.json(payload, { status: 200 });
    return withRateHeaders(res, rl, "HIT");
  }

  try {
    const record = await fetchGleif(lei);
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

    const res = NextResponse.json(cacheEntry, { status: 200 });
    return withRateHeaders(res, rl, "MISS");
  } catch (err) {
    if (err instanceof NotFoundError) {
      const notFound: InvalidLeiResponse = {
        valid: false,
        lei,
        error_code: "NOT_FOUND",
        error: "LEI not found in GLEIF database",
      };
      await cacheSet(cacheKey, notFound, INVALID_TTL);
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
