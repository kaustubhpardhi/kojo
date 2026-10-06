import type { NextConfig } from "next";

/*
 * Caching lives in public/sw.js, written by hand. next-pwa was removed because
 * it hooks into webpack and Next 16 builds with Turbopack, so its generated
 * worker and runtimeCaching config were silently never produced.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // There's a package-lock.json in the home directory that would otherwise win
  // the workspace-root guess and make Turbopack lose track of this app.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
