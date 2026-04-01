/**
 * Next.js configuration.
 *
 * Security headers note:
 *  Content-Security-Policy uses 'unsafe-inline' for script-src to maintain
 *  compatibility with Next.js App Router's inline script injection. For
 *  production hardening, replace with a nonce-based CSP implemented in
 *  middleware.ts (see Next.js docs: "Configuring CSP").
 */

import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "https", hostname: "www.goarch.org" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent rendering in iframes — defence against clickjacking.
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Restrict referrer information to same origin only for cross-origin requests.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable unnecessary browser features.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=()",
          },
          // HSTS: enforce HTTPS for 1 year (production only).
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
          // Content-Security-Policy.
          // Note: 'unsafe-inline' for script-src is needed for Next.js App Router
          // inline scripts. Upgrade to nonce-based CSP for stricter XSS protection.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.amazonaws.com https://www.goarch.org",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}`,
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
