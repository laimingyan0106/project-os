import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Node 24 can crash while spawning many page-data workers on Windows.
    // Keep Vercel/Linux on the framework default and cap only local Windows builds.
    cpus: process.platform === "win32" ? 2 : undefined,
    webpackBuildWorker: process.platform === "win32" ? false : undefined,
    workerThreads: process.platform === "win32" ? true : undefined,
  },
};

export default nextConfig;
