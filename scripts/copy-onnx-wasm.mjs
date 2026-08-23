// Copie le runtime ONNX WebAssembly de transformers.js dans les répertoires assets/
// produits par le build, AVANT l'injection du précache.
//
// Raison d'être : la dictée vocale tourne avec Whisper entièrement en local. Le moteur
// d'inférence (onnxruntime-web) charge son binaire .wasm depuis un CDN par défaut — ce
// qui briserait la dictée hors ligne au premier lancement sans réseau. En plaçant les
// fichiers dans `assets/`, ils sont repris automatiquement par inject-precache.mjs
// (qui liste tout le répertoire) et donc téléchargés une fois pour toutes à
// l'installation de l'application.
//
// Cette étape couvre les deux répertoires de sortie, comme inject-precache.mjs :
//   - `.output/public` → `npm run build`        (web, SSR/Cloudflare)
//   - `dist/client`    → `npm run build:static` (enveloppe Capacitor Android)
//
// En développement (`vite dev`) rien n'est copié : transformers.js garde alors son
// chargement CDN par défaut, ce qui convient très bien à une session de dev connectée.
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = join(process.cwd(), "node_modules", "@huggingface", "transformers", "dist");
const OUTPUT_DIRS = [".output/public", "dist/client"];

let runtimeFiles;
try {
  runtimeFiles = readdirSync(DIST).filter((f) => f.startsWith("ort-wasm"));
} catch {
  console.warn("[onnx] @huggingface/transformers absent — dictée vocale non déployée.");
  process.exit(0);
}

let copied = 0;

for (const dir of OUTPUT_DIRS) {
  const assetsDir = join(process.cwd(), dir, "assets");
  if (!existsSync(assetsDir)) continue; // ce mode de build n'a pas tourné

  for (const f of runtimeFiles) {
    copyFileSync(join(DIST, f), join(assetsDir, f));
    copied += 1;
  }
}

if (copied === 0) {
  console.warn(
    "[onnx] aucune sortie de build trouvée (.output/public ou dist/client) — rien à faire.",
  );
} else {
  console.info(`[onnx] ${runtimeFiles.join(", ")} copiés (${copied} fichier(s)).`);
}
