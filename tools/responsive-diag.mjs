/**
 * Diagnostic ciblé : une seule page, une seule taille — dump des erreurs JS
 * et de la pile affichée par l'écran d'erreur React.
 * Usage : node tools/responsive-diag.mjs 390 844 /pos
 */
import { chromium } from "playwright-core";

const [, , wArg, hArg, path] = process.argv;
const w = Number(wArg ?? 390);
const h = Number(hArg ?? 844);
const target = path ?? "/pos";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const context = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
});
await context.addInitScript(() => {
  window.localStorage.setItem(
    "pos_preferences",
    JSON.stringify({ onboarded: true, onboardingCompleted: true }),
  );
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log(`PAGEERROR: ${e.stack ?? e.message}`));
page.on("console", async (m) => {
  if (m.type() === "error" || m.type() === "warning") {
    const args = await Promise.all(
      m.args().map((a) => a.jsonValue().catch(() => "«non sérialisable»")),
    );
    console.log(
      `[${m.type()}]`,
      m.text().slice(0, 400),
      args.length ? JSON.stringify(args).slice(0, 600) : "",
    );
  }
});
await page.goto(`http://127.0.0.1:5199${target}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3500);
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("--- BODY ---\n", bodyText);
await page.screenshot({ path: ".responsive-shots/diag.png", fullPage: true });
await context.close();
console.log("done");
