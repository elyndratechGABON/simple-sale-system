/**
 * Test de bout en bout du PWA :
 *   1. boot en ligne sur /pos,
 *   2. enregistrement + activation du service worker,
 *   3. contenu réel des caches (précache installé),
 *   4. rechargement HORS LIGNE → l'application doit toujours démarrer.
 * Usage : node tools/pwa-check.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:5200";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));

let failed = 0;
const ok = (m) => console.log(`ok   ${m}`);
const ko = (m) => {
  console.log(`FAIL ${m}`);
  failed++;
};

// 1) Boot en ligne
await page.goto(`${BASE}/pos`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
const online = await page.evaluate(() => ({
  nav: !!document.querySelector('nav[aria-label="Navigation principale"]'),
  header: !!document.querySelector("header"),
}));
online.nav && online.header
  ? ok("boot en ligne : chrome applicatif rendu")
  : ko(`boot en ligne: ${JSON.stringify(online)}`);

// 2) Service worker enregistré et actif
const sw = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return { supported: false };
  const reg = await navigator.serviceWorker.ready.catch((e) => null);
  if (!reg) return { supported: true, ready: false };
  await navigator.serviceWorker.controller; // peut être null au tout premier chargement
  return {
    supported: true,
    ready: true,
    scope: reg.scope,
    state: (reg.active ?? reg.installing ?? reg.waiting)?.state,
    controller: !!navigator.serviceWorker.controller,
  };
});
sw.supported && sw.ready
  ? ok(`service worker prêt (${sw.state}, scope ${sw.scope})`)
  : ko(`service worker: ${JSON.stringify(sw)}`);

// Le contrôleur n'est pas encore pris au premier chargement — un reload le prend.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
controlled
  ? ok("page contrôlée par le service worker après reload")
  : ko("pas de contrôle après reload");

// 3) Caches réels
const caches_ = await page.evaluate(async () => {
  const keys = await caches.keys();
  const detail = {};
  for (const k of keys) detail[k] = (await caches.open(k)).then ? undefined : undefined;
  const counts = {};
  for (const k of keys) {
    const c = await caches.open(k);
    counts[k] = (await c.keys()).length;
  }
  return counts;
});
console.log("caches:", JSON.stringify(caches_));
Object.entries(caches_).some(([k, v]) => k.includes("assets") && v > 50)
  ? ok(
      `précache assets rempli (${Object.entries(caches_).filter(([k]) => k.includes("assets"))[0]?.[1]} entrées)`,
    )
  : ko(`cache assets insuffisant: ${JSON.stringify(caches_)}`);

// 4) Rechargement HORS LIGNE
await context.setOffline(true);
await page.goto(`${BASE}/pos`, { waitUntil: "load" }).catch(() => {});
await page.waitForTimeout(3000);
const offline = await page.evaluate(() => ({
  nav: !!document.querySelector('nav[aria-label="Navigation principale"]'),
  bodyLen: document.body.innerText.length,
  title: document.title.slice(0, 40),
}));
offline.nav && offline.bodyLen > 100
  ? ok(
      `hors ligne : l'application démarre (« ${offline.title} », ${offline.bodyLen} caractères rendus)`,
    )
  : ko(`hors ligne: ${JSON.stringify(offline)}`);

for (const e of errors) console.log(`[js] ${e}`);
await context.close();
console.log(failed === 0 ? "\nPWA OK" : `\n${failed} échec(s) PWA`);
process.exit(failed === 0 ? 0 : 1);
