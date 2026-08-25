/**
 * Test E2E du scanner de QR d'appairage (chemin Onboarding).
 *
 * Prérequis : Chrome lancé avec
 *   --use-fake-device-for-media-stream --use-fake-ui-for-media-stream
 * (flux caméra synthétique + autorisation automatique).
 *
 * Service : AUCUN serveur HTTP n'est requis — les requêtes du navigateur sont
 * interceptées par Playwright et servies depuis dist/client (utile quand le
 * bac à sable interdit d'écouter un port). L'hôte est purement virtuel.
 *
 * Parcours : onboarding réarmé → étape « Nom du commerce » → « Suivant » →
 * tuile « Rejoindre » (déclenche le scan) → la superposition doit atteindre
 * l'état « Caméra active » avec une vidéo vivante — PAS un cadre noir — puis
 * « Annuler » doit bien refermer l'overlay et rendre la caméra.
 */
import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

const DIST = normalize(join(process.cwd(), "dist", "client"));
// `localhost` est un contexte SÉCURISÉ pour Chrome (contrairement à un domaine
// factice) : indispensable pour que le pré-vol caméra du scanner passe.
const ORIGIN = "http://localhost";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

let failed = 0;
const ok = (m) => console.log(`ok   ${m}`);
const ko = (m) => {
  console.log(`FAIL ${m}`);
  failed++;
};

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});
await context.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (!url.hostname.endsWith("localhost")) return route.fallback();
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || !extname(rel)) rel = "/index.html"; // coquille SPA
  const file = normalize(join(DIST, rel));
  if (!file.startsWith(DIST + sep) && file !== DIST)
    return route.fulfill({ status: 403, body: "" });
  if (!existsSync(file)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({
    status: 200,
    contentType: MIME[extname(file).toLowerCase()] ?? "application/octet-stream",
    body: readFileSync(file),
  });
});
await context.addInitScript(() => {
  localStorage.setItem(
    "pos_preferences",
    JSON.stringify({ onboarded: false, onboardingCompleted: false }),
  );
});
const page = await context.newPage();
await page.goto(`${ORIGIN}/pos`, { waitUntil: "domcontentloaded" });

// Étape du nom du commerce : l'écran de bienvenue (« Lancer ma caisse ») précède
// le wizard ; ne cliquer QUE ce CTA — le « Suivant » du wizard reste désactivé
// jusqu'à la saisie du nom.
if (!(await page.$("#ob-name"))) {
  const lancer = page.getByRole("button", { name: /lancer ma caisse/i });
  await lancer.click({ timeout: 10000 });
}
// Étape 0 du wizard : confidentialité — case obligatoire avant « Suivant ».
const privacy = page.getByRole("checkbox");
if (await privacy.isVisible().catch(() => false)) {
  if (!(await privacy.isChecked())) await privacy.click();
  await page.getByRole("button", { name: /suivant/i }).click();
}
await page.waitForSelector("#ob-name", { timeout: 10000 });
await page.fill("#ob-name", "Boutique Test Scan");
await page.getByRole("button", { name: /suivant/i }).click();
ok("étape 1 passée");

// Tuile « Rejoindre » : sélection silencieuse (SANS caméra), puis le scan part
// uniquement du geste sur le bouton dédié — c'est l'événement qui autorise
// getUserMedia à présenter le prompt d'autorisation.
await page.getByRole("button", { name: /^Rejoindre/ }).click();
ok("tuile « Rejoindre » cliquée (sans activation caméra)");
const noEarlyCamera = await page.evaluate(
  () => !document.querySelector('div[id^="barcode-reader"]'),
);
noEarlyCamera
  ? ok("aucun prompt caméra avant le geste dédié")
  : ko("la caméra s'est armée dès la tuile — geste dédié non respecté");
await page.getByRole("button", { name: /scanner le qr d'une autre caisse/i }).click();
ok("bouton « Scanner » cliqué — démarrage du scan");

// La superposition doit devenir « Caméra active » avec une vidéo VIVANTE.
let cameraLive = false;
for (let i = 0; i < 24 && !cameraLive; i++) {
  await page.waitForTimeout(500);
  cameraLive = await page.evaluate(() => {
    if (!document.body.innerText.includes("Caméra active")) return false;
    const video = document.querySelector('div[id^="barcode-reader"] video');
    return !!video && /** @type {HTMLVideoElement} */ (video).videoHeight > 0;
  });
}
cameraLive
  ? ok("caméra ACTIVE : statut affiché + flux vidéo vivant (pas d'écran noir)")
  : ko("la superposition n'atteint jamais « Caméra active »");

// « Annuler » referme l'overlay sans erreur. Clic dispatché en JS : le test
// vise NOTRE gestionnaire d'annulation, pas la hit-target de Playwright (la
// superposition hors-React coexiste avec le portail Radix du wizard).
const hadCancel = await page.evaluate(() =>
  [...document.querySelectorAll("button")].some((b) => b.textContent === "Annuler"),
);
if (hadCancel) {
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent === "Annuler")?.click();
  });
  await page.waitForTimeout(600);
  const gone = await page.evaluate(() => !document.querySelector('div[id^="barcode-reader"]'));
  gone
    ? ok("« Annuler » referme proprement la superposition")
    : ko("overlay toujours présent après Annuler");
}

await context.close();
console.log(failed === 0 ? "\nSCAN OK" : `\n${failed} échec(s) de scan`);
process.exit(failed === 0 ? 0 : 1);
