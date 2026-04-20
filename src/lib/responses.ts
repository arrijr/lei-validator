import { NextResponse } from "next/server";
import type { RateLimitResult } from "./ratelimit";

export function withRateHeaders(
  res: NextResponse,
  rl: RateLimitResult,
  cache?: "HIT" | "MISS",
): NextResponse {
  res.headers.set("X-RateLimit-Limit", String(rl.limit));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, rl.remaining)));
  if (rl.reset) res.headers.set("X-RateLimit-Reset", String(rl.reset));
  if (cache) res.headers.set("X-Cache", cache);
  return res;
}

export function errorJson(
  status: number,
  error: string,
  code: string,
  rl?: RateLimitResult,
  cache?: "HIT" | "MISS",
): NextResponse {
  const res = NextResponse.json({ error, code }, { status });
  if (rl) withRateHeaders(res, rl, cache);
  return res;
}

export function rateLimitedResponse(rl: RateLimitResult): NextResponse {
  return errorJson(429, "Rate limit exceeded for your subscription tier", "RATE_LIMIT_EXCEEDED", rl);
}
