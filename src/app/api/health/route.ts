import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PING_LEI = "5493001KJTIIGC8Y1R12";
const PING_TIMEOUT = 3000;

async function pingGleif(): Promise<boolean> {
  const base = process.env.GLEIF_API_ENDPOINT || "https://api.gleif.org/api/v1";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
  try {
    const res = await fetch(`${base}/lei-records/${PING_LEI}`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.api+json" },
    });
    return res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const gleif_reachable = await pingGleif();
  return NextResponse.json({
    status: "ok",
    gleif_reachable,
    timestamp: new Date().toISOString(),
  });
}
