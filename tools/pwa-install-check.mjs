/**
 * Test du flux d'installation PWA — y compris LA COURSE DE CHARGEMENT qui faisait
 * échouer le bouton « Installer ».
 *
 * Scénario A (course réelle) : les bundles /assets/*.js sont RETARDÉS de 1,5 s et
 * l'événement `beforeinstallprompt` synthétique est tiré dès que le script inline
 * de capture est armé — donc AVANT le montage React. Le hook doit récupérer
 * l'événement via window.__pwaInstallEvent ; cliquer « Installer » doit appeler
 * prompt() et NE PAS afficher le message de repli.
 *
 * Scénario B (événement tardif) : sans retard, événement tiré après le montage —
 * chemin classique par écouteur. Mêmes assertions.
 *
 * Usage : node tools/pwa-install-check.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://127.0.0.1:5200";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");

let failed = 0;
const ok = (m) => console.log(`ok   ${m}`);
const ko = (m) => {
  console.log(`FAIL ${m}`);
  failed++;
};

const makeInit =
  (dispatchEvent) =>
  () => {
    window.__stubPromptCount = 0;
    window.__stubOutcome = "accepted";
    if (!dispatchEvent) return; // scénario « aucun prompt natif » (ex. contexte non sécurisé)
    (function fire() {
      // Attend que le script inline de __root.tsx ait posé son écouteur…
      if (!window.__pwaInstallCaptureArmed) return setTimeout(fire, 1);
      // …puis tire l'événement SYNTHÉTIQUE, comme le ferait Chrome après sa
      // vérification manifest+SW — potentiellement avant le montage React.
      const e = new Event("beforeinstallprompt");
      e.prompt = () => {
        window.__stubPromptCount += 1;
        return Promise.resolve();
      };
      e.userChoice = Promise.resolve({ outcome: window.__stubOutcome });
      Object.defineProperty(e, "userChoice", { value: e.userChoice });
      window.dispatchEvent(e);
    })();
  };
const INIT = makeInit(true);

async function runScenario(
  name,
  { delayBundles, buttonIndex, label, desktop = false, insecure = false },
) {
  const context = await browser.newContext(
    desktop
      ? { viewport: { width: 1366, height: 900 } }
      : { viewport: { width: 390, height: 844 }, isMobile: true },
  );
  await context.addInitScript(makeInit(!insecure));
  if (delayBundles) {
    // Retarder les bundles : React montera APRÈS le tir de l'événement.
    await context.route("**/assets/*.js", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      route.continue();
    });
  }
  const page = await context.newPage();
  // http://scan.test n'est PAS un contexte sûr : Chrome n'y expose jamais
  // beforeinstallprompt — exactement la situation d'un test en IP locale.
  const origin = insecure ? "http://scan.test" : BASE;
  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });

  // La landing monte TROIS « Installer » (header compact, hero, section finale).
  // Le bug historique : seul le premier monté (header) déclenchait l'installation,
  // les autres ouvraient le repli. Chaque position est cliquée en PREMIÈRE
  // interaction d'un contexte VIERGE : après une acceptance, tous les CTA
  // basculent sur « Ouvrir » et les boutons d'installation disparaissent.
  try {
    await page
      .getByRole("button", { name: /installer l'application/i })
      .nth(buttonIndex)
      .click({ timeout: 15000 });
  } catch {
    ko(`${name} [${label}]: bouton introuvable`);
    await context.close();
    return;
  }
  await page.waitForTimeout(1000);

  const res = await page.evaluate(() => ({
    stubPromptCount: window.__stubPromptCount ?? 0,
    fallbackVisible: document.body.innerText.includes("Ce navigateur ne propose pas de bouton"),
    insecureHelpVisible: document.body.innerText.includes("Connexion non sécurisée"),
    installedCta: document.body.innerText.includes("Ouvrir ELYNDRA CAISSE"),
  }));

  if (insecure) {
    // Aucun prompt natif possible : l'orchestrateur doit EXPLIQUER la cause.
    res.insecureHelpVisible
      ? ok(`${name} [${label}]: cause « Connexion non sécurisée » expliquée`)
      : ko(`${name} [${label}]: la cause http n'est pas expliquée`);
    res.stubPromptCount === 0
      ? ok(`${name} [${label}]: aucun prompt() tenté hors contexte sûr`)
      : ko(`${name} [${label}]: prompt() appelé en contexte non sécurisé ?!`);
    if (res.fallbackVisible) ko(`${name} [${label}]: message générique historique affiché`);
    else ok(`${name} [${label}]: message générique absent`);
  } else {
    res.stubPromptCount >= 1
      ? ok(`${name} [${label}]: prompt() appelé (${res.stubPromptCount}× au total)`)
      : ko(`${name} [${label}]: prompt() jamais appelé`);
    res.stubPromptCount === 1
      ? ok(`${name} [${label}]: consommation unique de l'événement`)
      : ko(`${name} [${label}]: ${res.stubPromptCount} appels prompt() (attendu : 1)`);
    if (res.fallbackVisible) ko(`${name} [${label}]: message de repli affiché à tort`);
    else ok(`${name} [${label}]: pas de message de repli`);
    if (!res.installedCta) ko(`${name} [${label}]: les CTA n'ont pas basculé sur « Ouvrir »`);
  }

  await context.close();
}

// NB : le CTA du header vit dans une nav `hidden lg:flex` — invisible en mobile.
// getByRole excluant les cachés, les index ci-dessous portent sur les boutons
// VISIBLES du viewport courant. Chaque clic est la première interaction d'un
// contexte vierge (après acceptance, tous les CTA deviennent « Ouvrir »).
await runScenario("A course", { delayBundles: true, buttonIndex: 0, label: "hero" });
await runScenario("B course", { delayBundles: true, buttonIndex: 1, label: "section basse" });
await runScenario("C tardif", { delayBundles: false, buttonIndex: 0, label: "hero" });
await runScenario("D desktop-header", {
  delayBundles: true,
  buttonIndex: 0,
  label: "header compact (lg+)",
  desktop: true,
});
await runScenario("E insecure", { delayBundles: false, buttonIndex: 0, label: "http local" });

console.log(failed === 0 ? "\nINSTALL OK" : `\n${failed} échec(s) d'installation`);
process.exit(failed === 0 ? 0 : 1);
