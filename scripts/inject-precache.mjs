// Injecte dans le sw.js émis la liste des assets hashés produits par le build.
//
// Raison d'être : `public/sw.js` est un fichier statique, copié tel quel. Il ne peut pas
// connaître les noms des bundles (`assets/pos-CyRt3juJ.js`), qui changent à chaque build.
// Sans cette injection, le service worker ne précache que des URL fixes : au tout premier
// lancement suivi d'une coupure réseau, l'application ne dispose d'aucun de ses scripts
// et affiche une page blanche — les assets ne sont mis en cache qu'après avoir été
// demandés une fois en ligne.
//
// Pourquoi une étape `postbuild` et NON un plugin Vite : le build web passe par nitro,
// qui copie la sortie client vers `.output/public` APRÈS que les hooks Vite se soient
// exécutés. Un `closeBundle` ne voit donc jamais le sw.js final. Cette étape tourne une
// fois tout le pipeline terminé, ce qui la rend indépendante de l'ordre interne des
// outils. Elle couvre les deux répertoires de sortie :
//   - `.output/public` → `npm run build`        (web, SSR/Cloudflare)
//   - `dist/client`    → `npm run build:static` (enveloppe Capacitor Android)
//
// Choix assumé : on précache TOUT le répertoire assets/, y compris les gros morceaux
// chargés à la demande (jspdf, html2canvas, recharts — plusieurs Mo). L'exigence est
// « toutes les fonctionnalités continuent de fonctionner sans Internet », et l'export PDF
// en est une. Précacher partiellement produirait une application qui marche hors ligne
// jusqu'au moment où l'utilisateur clique sur « PDF ».
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Marqueurs attendus dans public/sw.js. Les reformater là-bas casse l'injection —
// un commentaire le rappelle en tête de ce fichier.
const ASSETS_TOKEN = "const PRECACHE_ASSETS = [];";
const VERSION_TOKEN = 'const CACHE_VERSION = "dev";';

const OUTPUT_DIRS = [".output/public", "dist/client"];

let patched = 0;

for (const dir of OUTPUT_DIRS) {
  const swPath = join(process.cwd(), dir, "sw.js");

  let source;
  try {
    source = readFileSync(swPath, "utf8");
  } catch {
    continue; // ce mode de build n'a pas tourné
  }

  if (!source.includes(ASSETS_TOKEN)) {
    // Cas courant et sain : la sortie d'un build précédent est encore là et a déjà été
    // injectée. Compté comme un succès, sinon enchaîner `build` puis `build:static`
    // ferait échouer le second avec « aucun sw.js trouvé ».
    console.info(`[precache] ${dir}/sw.js : déjà injecté, ignoré.`);
    patched += 1;
    continue;
  }

  let files;
  try {
    files = readdirSync(join(process.cwd(), dir, "assets"));
  } catch {
    console.warn(`[precache] ${dir}/assets introuvable, injection ignorée.`);
    continue;
  }

  const urls = files.map((f) => `/assets/${f}`).sort();
  // La version de cache dérive du contenu de la liste : deux builds identiques gardent
  // le même cache, un build qui change un asset invalide l'ancien. Sans ça les caches des
  // versions précédentes s'accumuleraient sur l'appareil, puisque le `activate` du
  // service worker ne supprime que les caches d'une AUTRE version.
  const version = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 8);

  writeFileSync(
    swPath,
    source
      .replace(ASSETS_TOKEN, `const PRECACHE_ASSETS = ${JSON.stringify(urls)};`)
      .replace(VERSION_TOKEN, `const CACHE_VERSION = ${JSON.stringify(version)};`),
  );

  console.info(`[precache] ${dir}/sw.js : ${urls.length} assets injectés (v${version})`);
  patched += 1;
}

if (patched === 0) {
  // Échec bruyant : un service worker sans précache se déploie sans erreur visible et ne
  // se remarque que le jour où un utilisateur ouvre l'application hors ligne.
  console.error("[precache] aucun sw.js trouvé — le build est-il bien terminé ?");
  process.exit(1);
}
