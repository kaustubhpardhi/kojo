import type { NextConfig } from "next";

/*
 * Caching lives in public/sw.js, written by hand. next-pwa was removed because
 * it hooks into webpack and Next 16 builds with Turbopack, so its generated
 * worker and runtimeCaching config were silently never produced.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default nextConfig;
