import type { NextConfig } from "next";

// Security headers (HSTS, nosniff, X-Frame-Options, Referrer-Policy,
// Permissions-Policy, and — once enabled — CSP) are applied at the edge by
// nginx (see deploy/nginx/recallai.conf), so they are intentionally NOT set
// here to avoid duplicate response headers.
const nextConfig: NextConfig = {
  poweredByHeader: false,
};

export default nextConfig;
