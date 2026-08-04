// Service worker écrit à la main — pas de Workbox, volontairement.
//
// Trois stratégies suffisent ici et tiennent en 120 lignes lisibles : précache à
// l'installation, network-first pour les navigations (une page fraîche quand le réseau
// répond, la version en cache sinon), cache-first pour les assets (immuables, ils sont
// hashés). Workbox apporterait une dépendance de build et une couche d'indirection pour
// exactement ce comportement.
//
// CACHE_VERSION et PRECACHE_ASSETS sont RÉÉCRITS AU BUILD par
// scripts/inject-precache.mjs (étape `npm run precache`, enchaînée après chaque build).
// Leurs déclarations doivent rester LITTÉRALEMENT identiques aux marqueurs attendus par
// ce script — ne pas reformater ces deux lignes, ne pas les fusionner, ne pas changer les
// guillemets. Les valeurs ci-dessous sont celles utilisées en développement.
const CACHE_PREFIX = "caisse-pos";
const CACHE_VERSION = "dev";
const PRECACHE_ASSETS = [];

const PAGES_CACHE = `${CACHE_PREFIX}-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;

// Toutes les routes de l'application, pas seulement l'accueil : en rendu serveur chaque
// route a son propre document HTML. Sans elles, ouvrir /reports hors ligne au premier
// lancement retomberait sur le document de /pos.
const PRECACHE_PAGES = [
  "/",
  "/pos",
  "/stocks",
  "/expenses",
  "/history",
  "/reports",
  "/settings",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Pages et assets dans des caches distincts : ils n'ont pas la même stratégie de
      // lecture, et les mélanger ferait servir un document HTML périmé comme un asset.
      const [pages, assets] = await Promise.all([
        caches.open(PAGES_CACHE),
        caches.open(ASSETS_CACHE),
      ]);
      await Promise.all([
        precacheInto(pages, PRECACHE_PAGES),
        precacheInto(assets, PRECACHE_ASSETS),
      ]);
      self.skipWaiting();
    })(),
  );
});

// `allSettled` et non `all` : une seule URL en échec (route retirée, réseau qui coupe en
// cours d'installation) ne doit pas faire échouer toute l'installation et laisser
// l'application sans service worker.
async function precacheInto(cache, urls) {
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) return;
        // Une redirection serveur (ex. `/` → `/pos`) laisse `res.url` pointer vers la
        // cible. Stockée telle quelle, la navigation hors-ligne vers `url` échouerait :
        // Chrome refuse de committer une réponse dont l'URL diffère de la requête. On
        // stocke donc un clone dont l'URL correspond à la clé demandée.
        const entry =
          new URL(res.url).pathname === url
            ? res
            : new Response(res.body, {
                status: res.status,
                statusText: res.statusText,
                headers: res.headers,
              });
        await cache.put(url, entry);
      } catch {}
    }),
  );
}

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
  } catch {
    // Rien en cache et pas de réseau : l'appelant doit voir un échec, pas une réponse
    // vide traitée comme un succès.
    return new Response("", { status: 504 });
  }
}
