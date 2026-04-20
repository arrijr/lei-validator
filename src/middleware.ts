import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/api/v1/:path*"],
};

export function middleware(req: NextRequest) {
  const expected = process.env.RAPIDAPI_PROXY_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: RAPIDAPI_PROXY_SECRET not set", code: "MISCONFIGURED" },
      { status: 500 },
    );
  }
  const got = req.headers.get("x-rapidapi-proxy-secret");
  if (got !== expected) {
    return NextResponse.json(
      { error: "Forbidden: requests must come through RapidAPI", code: "FORBIDDEN" },
      { status: 403 },
    );
  }
  return NextResponse.next();
}
