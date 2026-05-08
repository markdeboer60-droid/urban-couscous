import type { NextConfig } from "next";

// Non-CSP security headers applied to every response.
// CSP with per-request nonce is handled in proxy.ts.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // 2-year HSTS with subdomains; preload-eligible.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "@react-pdf/renderer"],
  // Explicitly set root so Turbopack doesn't pick up a stray package-lock.json
  // higher up in the filesystem and resolve node_modules from the wrong directory.
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
