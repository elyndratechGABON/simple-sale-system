const CACHE_PREFIX = "caisse-pos";
const CACHE_VERSION = "v1";
const PAGES_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/pos",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res);
          } catch {}
        }),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith(CACHE_PREFIX) && key !== PAGES_CACHE && key !== ASSETS_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }
  event.respondWith(assetHandler(request));
});

async function navigationHandler(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(request, res.clone());
      return res;
    }
  } catch {}

  const cache = await caches.open(PAGES_CACHE);
  const cached =
    (await cache.match(request)) || (await cache.match("/pos")) || (await cache.match("/"));
  if (cached) return cached;

  return new Response("Hors-ligne", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function assetHandler(request) {
  const cache = await caches.open(ASSETS_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") {
      await cache.put(request, res.clone());
    }
    return res;
  } catch (error) {
    if (cached) return cached;
    return new Response("", { status: 504 });
  }
}
