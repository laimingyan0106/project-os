import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
