import type { NextConfig } from "next";

// Applied to every response. These are safe defaults that don't depend on
// per-page nonces. NOTE: a Content-Security-Policy is the strongest backstop for
// the BYOK key held in sessionStorage — a template is included below but left
// commented because it must be verified in-browser against the PDF <embed>, the
// Umami script, and framer-motion's inline styles before being enforced.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // TODO(security): enable after browser-testing. Derive the Umami origin from
  // NEXT_PUBLIC_UMAMI_SCRIPT_URL and add it to script-src/connect-src.
  // {
  //   key: "Content-Security-Policy",
  //   value: [
  //     "default-src 'self'",
  //     "script-src 'self' 'unsafe-inline' <umami-origin>",
  //     "style-src 'self' 'unsafe-inline'",
  //     "img-src 'self' data: blob:",
  //     "font-src 'self' data:",
  //     "connect-src 'self' <umami-origin>",
  //     "object-src 'self' blob:",
  //     "frame-ancestors 'none'",
  //     "base-uri 'self'",
  //     "form-action 'self'",
  //   ].join("; "),
  // },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
