/**
 * Assertions structurelles responsive — complète le scan d'overflow :
 *   • barre d'onglets mobile : visible, fixed, en bas, 5 liens, cachée ≥ lg ;
 *   • header compact ~64px sur téléphone, logo borné ;
 *   • contenu principal jamais sous la barre (padding-bottom de réserve) ;
 *   • cibles tactiles : compte des contrôles < 40px sur téléphone.
 * Usage : node tools/ui-checks.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:5200";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");

let failures = 0;
const fail = (m) => {
  console.log(`FAIL ${m}`);
  failures++;
};
const pass = (m) => console.log(`ok   ${m}`);

for (const vp of [
  { name: "mobile", w: 390, h: 844, mobile: true },
  { name: "desktop", w: 1440, h: 900, mobile: false },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: vp.mobile,
    isMobile: vp.mobile,
  });
  await ctx.addInitScript(() => {
    window.localStorage.setItem(
      "pos_preferences",
      JSON.stringify({ onboarded: true, onboardingCompleted: true }),
    );
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/pos`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const ui = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigation principale"]');
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    const logo = header?.querySelector("img");
    const r = (el) => (el ? el.getBoundingClientRect() : null);
    const navR = r(nav);
    const headerR = r(header);
    const smallTargets = [];
    if (window.innerWidth >= 1024 === false) {
      for (const el of document.querySelectorAll("button, a[href], [role='button']")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        // On ignore les puces de texte inline (liens dans un paragraphe).
        const cs = getComputedStyle(el);
        if (cs.display === "inline") continue;
        if (b.height < 40 || b.width < 40) {
          smallTargets.push({
            tag: el.tagName.toLowerCase(),
            w: Math.round(b.width),
            h: Math.round(b.height),
            label: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30),
          });
        }
      }
    }
    return {
      navExists: !!nav,
      navPosition: nav ? getComputedStyle(nav).position : null,
      navVisible: nav ? getComputedStyle(nav).display !== "none" : false,
      navBottomGap: navR ? Math.round(window.innerHeight - navR.bottom) : null,
      navLinks: nav ? nav.querySelectorAll("a").length : 0,
      navHeight: navR ? Math.round(navR.height) : null,
      headerH: headerR ? Math.round(headerR.height) : null,
      logoBox: logo ? { w: Math.round(r(logo).width), h: Math.round(r(logo).height) } : null,
      mainPadBottom: main ? getComputedStyle(main).paddingBottom : null,
      smallTargets: smallTargets.slice(0, 12),
      smallCount: smallTargets.length,
    };
  });

  if (vp.mobile) {
    ui.navExists && ui.navVisible && ui.navLinks === 5
      ? pass(`${vp.name}: barre basse présente, 5 onglets`)
      : fail(
          `${vp.name}: barre basse (${JSON.stringify({ e: ui.navExists, v: ui.navVisible, n: ui.navLinks })})`,
        );
    ui.navPosition === "fixed"
      ? pass(`${vp.name}: navigation en position fixed`)
      : fail(`${vp.name}: position=${ui.navPosition}`);
    ui.navBottomGap !== null && ui.navBottomGap <= 1
      ? pass(`${vp.name}: barre collée au bas (écart ${ui.navBottomGap}px)`)
      : fail(`${vp.name}: écart bas=${ui.navBottomGap}px`);
    ui.navHeight >= 44
      ? pass(`${vp.name}: hauteur onglets ${ui.navHeight}px`)
      : fail(`${vp.name}: hauteur ${ui.navHeight}px`);
    ui.headerH >= 56 && ui.headerH <= 80
      ? pass(`${vp.name}: header compact ${ui.headerH}px`)
      : fail(`${vp.name}: header ${ui.headerH}px`);
    ui.logoBox && ui.logoBox.h <= 48
      ? pass(`${vp.name}: logo borné ${ui.logoBox.w}×${ui.logoBox.h}`)
      : fail(`${vp.name}: logo ${JSON.stringify(ui.logoBox)}`);
    parseFloat(ui.mainPadBottom) >= 56
      ? pass(`${vp.name}: réserve sous la barre = ${ui.mainPadBottom}`)
      : fail(`${vp.name}: padding-bottom main = ${ui.mainPadBottom}`);
    pass(`${vp.name}: cibles <40px restantes = ${ui.smallCount}`);
    for (const t of ui.smallTargets) console.log(`     · ${t.tag} ${t.w}×${t.h} «${t.label}»`);
  } else {
    !ui.navVisible
      ? pass(`${vp.name}: barre basse absente au-delà de lg`)
      : fail(`${vp.name}: barre basse encore visible en desktop`);
    ui.headerH > 0
      ? pass(`${vp.name}: header rendu (${ui.headerH}px)`)
      : fail(`${vp.name}: header absent`);
  }
  await ctx.close();
}

await browser.close();
console.log(failures === 0 ? "\nCHECKS OK" : `\n${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
