/* Hand-rolled service worker: no Workbox, no external services. */
const CACHE_PREFIX = "ikizami-pwa-";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// The question bank is bundled into the app shell, so caching these files is
// enough to run a full quiz offline. Sign images are cached on demand below.
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/patterns/imigongo-band.svg",
  "/patterns/imigongo-side.svg",
  "/patterns/imigongo-tile.svg",
  "/patterns/imigongo-tile-light.svg",
  "/assets/images.jpeg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            // Skip an asset that is temporarily unavailable; keep installing.
          }
        }),
      );

      // The worker registers after the first page has loaded, so it never sees
      // that page's hashed JS/CSS/font requests. Extract those URLs from the
      // cached HTML instead, otherwise the first offline visit would break.
      try {
        const html = await (await cache.match("/")).text();
        const assets = new Set(html.match(/\/_next\/static\/[A-Za-z0-9._/-]+/g) || []);
        await Promise.all(
          [...assets].map(async (url) => {
            try {
              await cache.add(new Request(url, { cache: "reload" }));
            } catch {
              // Ignore any asset that cannot be fetched right now.
            }
          }),
        );
      } catch {
        // The shell was already cached above; proceed without extra assets.
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/patterns/") ||
    pathname.startsWith("/signs/") ||
    pathname.startsWith("/assets/")
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never serve the service worker itself from cache — updates must be seen.
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request, false));
  }
});

async function networkFirst(request, isNavigation) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (isNavigation) {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return Response.error();
  }
}
