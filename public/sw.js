/*
 * Service worker for Reps.
 *
 * Asset cache only. Next.js 16 App Router + Supabase SSR must not have their
 * navigations or RSC/Flight payloads go through the worker — intercepting
 * them (even NetworkFirst) adds latency to every tap and can hang the router
 * after a deploy when a stale Flight payload is served.
 *
 * What we cache:
 *   - /_next/static/*  (hashed, immutable)
 *   - /icons/*, fonts, the manifest
 *   - /offline + the chunks it needs to render with no network
 *
 * Everything else — pages, RSC, auth, Supabase — goes straight to the network.
 * Offline navigations fall back to /offline.
 *
 * Bump VERSION to invalidate every cache at once.
 */
const VERSION = "reps-v3";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const FONTS = `${VERSION}-fonts`;

const OFFLINE_URL = "/offline";
const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await Promise.allSettled([
        ...PRECACHE.map((url) => shell.add(new Request(url, { cache: "reload" }))),
        precacheOfflinePage(shell),
      ]);
      await self.skipWaiting();
    })(),
  );
});

/**
 * The offline page is useless without the chunks that render it, and their
 * names are build hashes. Cache the page, then read its markup for the assets.
 */
async function precacheOfflinePage(shell) {
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) throw new Error(`offline page ${response.status}`);

  const html = await response.clone().text();
  await shell.put(OFFLINE_URL, response);

  const assets = new Set(
    html.replace(/\\\//g, "/").match(/\/_next\/static\/[^"'\\\s]+?\.(?:js|css)/g) ?? [],
  );
  const staticCache = await caches.open(STATIC);
  await Promise.allSettled([...assets].map((url) => staticCache.add(url)));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      // Drop every previous version, including the reps-v2 pages cache that
      // was storing navigations and RSC payloads.
      await Promise.all(names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin: only cache Google Fonts. Never touch Supabase / wger —
  // those stay on the network so search and auth stay live.
  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(cacheFirst(request, FONTS));
    }
    return;
  }

  // App Router internals and auth must never be intercepted.
  if (isAppRouterInternal(request) || url.pathname.startsWith("/auth")) return;

  // Hashed build assets and icons — safe to cache forever.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // Navigations: network only. If the device is offline, land on /offline.
  // We deliberately do not cache HTML — a cached document fights the App
  // Router and makes the installed PWA feel a beat behind every tap.
  if (request.mode === "navigate") {
    event.respondWith(navigateOrOffline(request));
  }
});

function isAppRouterInternal(request) {
  const url = new URL(request.url);
  if (url.searchParams.has("_rsc")) return true;
  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-State-Tree")) return true;
  const accept = request.headers.get("Accept") || "";
  if (accept.includes("text/x-component")) return true;
  return false;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function navigateOrOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL);
    if (new URL(request.url).pathname !== OFFLINE_URL) {
      return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);
    }
    return (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}
