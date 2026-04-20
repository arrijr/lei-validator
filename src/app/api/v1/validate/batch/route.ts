import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { cacheGet, cacheSet } from "@/lib/redis";
import { normalizeLei, validateLeiFormat, fetchGleif, isActive, isExpiringSoon, NotFoundError } from "@/lib/lei";
import { errorJson, rateLimitedResponse, withRateHeaders } from "@/lib/responses";
import { TIER_BATCH_LIMITS, type LeiResult, type GleifRecord } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HARD_MAX = 50;
const VALID_TTL = 86400;
const INVALID_TTL = 3600;

async function validateSingle(raw: string): Promise<LeiResult> {
  const lei = normalizeLei(raw);

  if (!validateLeiFormat(lei)) {
    return {
      valid: false,
      lei,
      error_code: "INVALID_FORMAT",
      error: "LEI must be exactly 20 alphanumeric characters",
    };
  }

  const cacheKey = `lei:${lei}`;
  const cached = await cacheGet<LeiResult>(cacheKey);
  if (cached) {
    return cached.valid ? { ...cached, cached: true } : cached;
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
    return result;
  } catch (err) {
    if (err instanceof NotFoundError) {
      const result: LeiResult = {
        valid: false,
        lei,
        error_code: "NOT_FOUND",
        error: "LEI not found in GLEIF database",
      };
      await cacheSet(cacheKey, result, INVALID_TTL);
      return result;
    }
    return {
      valid: false,
      lei,
      error_code: "SERVICE_UNAVAILABLE",
      error: "GLEIF database temporarily unavailable",
    };
  }
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(req.headers);
  if (!rl.success) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(400, "Invalid JSON body", "INVALID_JSON", rl);
  }

  const leis = (body as { leis?: unknown } | null)?.leis;
  if (!Array.isArray(leis) || leis.length === 0) {
    return errorJson(400, "'leis' must be a non-empty array", "INVALID_FORMAT", rl);
  }
  if (leis.some((e) => typeof e !== "string")) {
    return errorJson(400, "All entries in 'leis' must be strings", "INVALID_FORMAT", rl);
  }
  if (leis.length > HARD_MAX) {
    return errorJson(400, `Batch size ${leis.length} exceeds hard limit of ${HARD_MAX}`, "BATCH_LIMIT_EXCEEDED", rl);
  }

  const tierLimit = TIER_BATCH_LIMITS[rl.tier];
  if (tierLimit === 0) {
    return errorJson(422, "Batch endpoint is not available on the Free tier. Upgrade to Basic or higher.", "BATCH_NOT_ALLOWED", rl);
  }
  if (leis.length > tierLimit) {
    return errorJson(422, `Batch size ${leis.length} exceeds your plan limit of ${tierLimit}.`, "BATCH_LIMIT_EXCEEDED", rl);
  }

  const settled = await Promise.allSettled((leis as string[]).map(validateSingle));

  const results: LeiResult[] = settled.map((s, i) => {
    if (s.status === "rejected") {
      return {
        valid: false as const,
        lei: normalizeLei(leis[i] as string),
        error_code: "SERVICE_UNAVAILABLE" as const,
        error: "Validation failed",
      };
    }
    return s.value;
  });

  const valid_count = results.filter((r) => r.valid).length;
  const invalid_count = results.length - valid_count;
  const expiring_soon_count = results.filter(
    (r): r is Extract<LeiResult, { valid: true }> => r.valid && r.expires_soon,
  ).length;

  const res = NextResponse.json(
    { results, total: results.length, valid_count, invalid_count, expiring_soon_count },
    { status: 200 },
  );
  return withRateHeaders(res, rl);
}
