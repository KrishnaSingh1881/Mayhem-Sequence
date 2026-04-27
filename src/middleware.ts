import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/public/feedback/",
  "/api/public/changelog/",
];

function isPublicApiPath(pathname: string) {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/") || isPublicApiPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ms_token")?.value;
  console.log(`[MIDDLEWARE] Path: ${pathname}, Token present: ${!!token}`);

  if (!token) {
    console.warn(`[MIDDLEWARE] Unauthorized: No token for path ${pathname}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    console.warn(`[MIDDLEWARE] Unauthorized: Invalid token for path ${pathname}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[MIDDLEWARE] Authorized: User ${payload.userId} accessing ${pathname}`);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Also expose x-user-id as a response header so next/headers() can read it
  response.headers.set("x-user-id", payload.userId);

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
