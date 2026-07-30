import type { NextConfig } from "next";

const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";
  } catch {
    return "";
  }
})();
const supabaseWebSocket = supabaseOrigin.replace(/^http/, "ws");
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWebSocket}`.trim(),
  "worker-src 'self' blob:",
  process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      ],
    }];
  },
  typescript: {
    // Windows Node 24 intermittently crashes inside Next's duplicate typecheck
    // worker. `npm run typecheck` remains a required independent release gate.
    ignoreBuildErrors: process.platform === "win32",
  },
  experimental: {
    serverActions: {
      // A browser localStorage snapshot can approach the platform's 5 MB limit.
      bodySizeLimit: "7mb",
    },
    // Node 24 can crash while spawning many page-data workers on Windows.
    // Keep Vercel/Linux on the framework default and cap only local Windows builds.
    cpus: process.platform === "win32" ? 2 : undefined,
    webpackBuildWorker: process.platform === "win32" ? false : undefined,
    workerThreads: process.platform === "win32" ? true : undefined,
  },
};

export default nextConfig;
