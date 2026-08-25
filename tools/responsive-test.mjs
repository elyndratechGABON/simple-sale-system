/**
 * Tests responsive automatisés — Elyndra Caisse.
 *
 * Pour chaque taille d'écran de la mission × chaque page de l'application :
 *  1. charge la page (onboarding neutralisé via localStorage),
 *  2. vérifie l'ABSENCE de débordement horizontal global (html/body/main),
 *  3. liste les éléments qui dépassent réellement le viewport (diagnostic),
 *  4. capture une capture plein écran dans .responsive-shots/.
 *
 * Usage : node tools/responsive-test.mjs [baseUrl]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:5199";
const OUT = new URL("../.responsive-shots/", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1",
);

const VIEWPORTS = [
  { name: "phone-sm", w: 320, h: 568 },
  { name: "phone-360", w: 360, h: 800 },
  { name: "phone-375", w: 375, h: 812 },
  { name: "phone-390", w: 390, h: 844 },
  { name: "phone-414", w: 414, h: 896 },
  { name: "tablet-portrait", w: 768, h: 1024 },
  { name: "tablet-landscape", w: 1024, h: 768 },
  { name: "laptop-sm", w: 1280, h: 720 },
  { name: "laptop", w: 1366, h: 768 },
  { name: "laptop-lg", w: 1440, h: 900 },
  { name: "desktop-xl", w: 1920, h: 1080 },
];

const PAGES = [
  { path: "/pos", label: "caisse" },
  { path: "/stocks", label: "stocks" },
  { path: "/reports", label: "rapports" },
  { path: "/dashboard", label: "accueil" },
  { path: "/settings", label: "reglages" },
  { path: "/history", label: "historique" },
];

/** Ouvre la modale « Historique des mouvements » sur Stocks (bottom sheet mobile). */
async function openMovements(page) {
  const btn = page.getByRole("button", { name: /mouvements|journal/i }).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(600);
    return true;
  }
  return false;
}

function describeElement(el) {
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 4) {
    const tag = node.tagName.toLowerCase();
    const cls =
      typeof node.className === "string" ? node.className.split(/\s+/).slice(0, 3).join(".") : "";
    parts.unshift(`${tag}${cls ? "." + cls : ""}`);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

mkdirSync(OUT, { recursive: true });

// Connexion à un Chrome DÉJÀ LANCÉ avec --remote-debugging-port :
// le bac à sable interdit les pipes locaux que `chromium.launch()` ouvre
// (`--remote-debugging-pipe`), mais un WebSocket TCP passe.
const browser = await chromium.connectOverCDP(process.env.CDP_URL ?? "http://127.0.0.1:9333");

let failures = 0;
const report = [];

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    deviceScaleFactor: vp.w <= 480 ? 3 : vp.w <= 1024 ? 2 : 1,
    hasTouch: vp.w <= 1024,
    isMobile: vp.w < 1024,
  });
  await context.addInitScript(() => {
    window.localStorage.setItem(
      "pos_preferences",
      JSON.stringify({ onboarded: true, onboardingCompleted: true }),
    );
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.split("\n")[0]}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });

  for (const target of PAGES) {
    const url = `${BASE}${target.path}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      // L'app affiche un écran de chargement (~650 ms min) puis hydrate les données.
      await page.waitForTimeout(2200);
    } catch (e) {
      report.push(
        `FAIL ${vp.name} ${target.path}: navigation impossible (${e.message.split("\n")[0]})`,
      );
      failures++;
      continue;
    }

    const audit = await page
      .evaluate(() => {
        const vw = document.documentElement.clientWidth;
        // Un ancêtre scrolle horizontalement ? L'élément n'est pas un débordement
        // de page : c'est un carrousel/filtre à défilement voulu.
        function insideHScroller(el) {
          for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (["auto", "scroll", "clip"].includes(s.overflowX) && s.overflowY !== "visible") {
              return true;
            }
            if (s.overflowX === "auto" || s.overflowX === "scroll") return true;
          }
          return false;
        }
        const offenders = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.position === "fixed") continue; // couches overlay volontaires
          if (r.right > vw + 1 || r.left < -1) {
            if (insideHScroller(el)) continue;
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className ?? "").slice(0, 80),
              right: Math.round(r.right),
              left: Math.round(r.left),
              text: (el.textContent ?? "").trim().slice(0, 40),
            });
          }
        }
        return {
          scrollW: document.documentElement.scrollWidth,
          bodyScrollW: document.body.scrollWidth,
          vw,
          offenders: offenders.slice(0, 6),
          offenderCount: offenders.length,
        };
      })
      .catch((e) => ({ error: String(e) }));

    // `clientW` est recalculé proprement ci-dessous si l'évaluateur a échoué.
    if (!audit.error) {
      const globalOverflow = audit.scrollW > audit.vw + 1 || audit.bodyScrollW > audit.vw + 1;
      if (globalOverflow || audit.offenderCount > 0) {
        failures++;
        report.push(
          `FAIL ${vp.name} (${vp.w}×${vp.h}) ${target.path}: scrollW=${audit.scrollW} bodyW=${audit.bodyScrollW} vw=${audit.vw} offenders=${audit.offenderCount}`,
        );
        for (const o of audit.offenders) {
          report.push(`     · <${o.tag}> right=${o.right} «${o.text}» ${o.cls}`);
        }
        if (errors.length) {
          for (const e of errors.slice(0, 4)) report.push(`     [js] ${e}`);
        }
      } else {
        report.push(`ok   ${vp.name} ${target.path}`);
      }
    } else {
      report.push(`FAIL ${vp.name} ${target.path}: audit ${audit.error.slice(0, 120)}`);
      failures++;
    }

    await page.screenshot({
      path: `${OUT}${vp.name}-${target.label}.png`,
      fullPage: true,
    });

    // Modale mouvements : uniquement en petit téléphone et en desktop, pour valider
    // les DEUX conteneurs (bottom sheet <md, dialogue centré ≥md).
    if (target.path === "/stocks" && [320, 390, 768, 1440].includes(vp.w)) {
      const opened = await openMovements(page);
      if (opened) {
        await page.waitForTimeout(400);
        const modalAudit = await page.evaluate(() => {
          const dlg = document.querySelector("[role='dialog'], [data-vaul-drawer]");
          if (!dlg) return { missing: true };
          const r = dlg.getBoundingClientRect();
          return {
            width: Math.round(r.width),
            left: Math.round(r.left),
            vw: document.documentElement.clientWidth,
          };
        });
        if (modalAudit.missing) {
          report.push(`FAIL ${vp.name} stocks-modale: dialogue introuvable après clic`);
          failures++;
        } else {
          const fits = modalAudit.left >= -1 && modalAudit.width <= modalAudit.vw + 1;
          report.push(
            `${fits ? "ok  " : "FAIL"} ${vp.name} stocks-modale: w=${modalAudit.width} left=${modalAudit.left}`,
          );
          if (!fits) failures++;
          await page.screenshot({ path: `${OUT}${vp.name}-stocks-modale.png`, fullPage: false });
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      }
    }
  }

  await context.close();
}

await browser.close();

console.log("\n=== RAPPORT RESPONSIVE ===");
for (const line of report) console.log(line);
console.log(
  `\n${failures === 0 ? "TOUT OK" : `${failures} problème(s)`} — captures: .responsive-shots/`,
);
process.exit(failures === 0 ? 0 : 1);
