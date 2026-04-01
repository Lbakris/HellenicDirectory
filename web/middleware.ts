/**
 * Next.js Edge Middleware — authentication guard for protected routes.
 *
 * Security note: The middleware verifies the JWT *signature* using the shared
 * JWT_ACCESS_SECRET. This prevents requests with tampered or forged tokens from
 * reaching protected pages. Mere cookie presence is not sufficient.
 *
 * jose is used for JWT verification because it is compatible with the Next.js
 * Edge Runtime (no Node.js crypto module required).
 */

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/directories", "/profile", "/messages"];

/** TextEncoder-encoded secret for jose — created once at module load. */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("hd_access")?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  // Verify the JWT signature and expiry — not just presence.
  try {
    await jwtVerify(token, getSecret());
    return NextResponse.next();
  } catch {
    // Token is invalid, tampered, or expired. Clear the stale cookie and redirect.
    const response = redirectToLogin(req);
    response.cookies.delete("hd_access");
    return response;
  }
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/directories/:path*",
    "/profile/:path*",
    "/messages/:path*",
  ],
};
