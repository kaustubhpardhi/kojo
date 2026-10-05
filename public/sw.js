/*
 * Service worker for Reps.
 *
 * Hand-written rather than generated: next-pwa is a webpack plugin and Next 16
 * builds with Turbopack, so a generated worker never gets produced.
 *
 * The rule that matters: Supabase requests are never intercepted. Logged sets
 * and session reads must always hit the network or go through the IndexedDB
 * outbox in src/lib/offline.ts — a cached workout is a wrong workout.
 *
 * Bump VERSION to invalidate every cache at once.
 */
const VERSION = "reps-v2";
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const FONTS = `${VERSION}-fonts`;
const WGER = `${VERSION}-wger`;

const OFFLINE_URL = "/offline";

const PRECACHE = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      // Settled, not all: one missing file must not fail the whole install.
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
 * names are build hashes. So cache the page, then read its own markup to find
 * out which assets it needs.
 */
async function precacheOfflinePage(shell) {
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) throw new Error(`offline page ${response.status}`);

  const html = await response.clone().text();
  await shell.put(OFFLINE_URL, response);

  // Inline flight data escapes its slashes, so normalise before matching.
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
      await Promise.all(
        names.filter((name) => !name.startsWith(VERSION)).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
      event.respondWith(cacheFirst(request, FONTS));
    } else if (url.hostname === "wger.de" && url.pathname.startsWith("/api")) {
      event.respondWith(networkFirst(request, WGER, 8000));
    }
    // Everything else cross-origin — Supabase above all — goes straight out.
    return;
  }

  // Auth callbacks issue redirects and carry one-time codes. Never store them.
  if (url.pathname.startsWith("/auth")) return;

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }

  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(pageOrOffline(request));
    return;
  }

  // Client-side navigations fetch RSC payloads for the same routes.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") {
    event.respondWith(networkFirst(request, PAGES, 5000));
  }
});

/** Only basic, successful responses are worth storing. */
function isCacheable(response) {
  return response && response.ok && response.type === "basic";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/**
 * Serve from cache if the network hasn't answered within `timeout`, but keep
 * waiting on the network so the cache still gets refreshed.
 */
async function networkFirst(request, cacheName, timeout) {
  const cache = await caches.open(cacheName);

  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  const timed = await Promise.race([
    network,
    new Promise((resolve) => setTimeout(() => resolve(undefined), timeout)),
  ]);
  if (timed) return timed;

  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await network;
  if (response) return response;
  throw new Error("Offline and nothing cached");
}

async function pageOrOffline(request) {
  try {
    return await networkFirst(request, PAGES, 5000);
  } catch {
    const cache = await caches.open(SHELL);

    // Redirect rather than serving /offline's HTML under the requested URL:
    // the App Router would try to hydrate that route with the wrong payload
    // and throw a client-side exception.
    if (new URL(request.url).pathname !== OFFLINE_URL) {
      return Response.redirect(new URL(OFFLINE_URL, self.location.origin).href, 302);
    }

    return (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}
