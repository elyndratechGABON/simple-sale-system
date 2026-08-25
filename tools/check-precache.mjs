/** Vérifie que le sw.js construit précache uniquement des fichiers réellement présents. */
import { readFileSync, existsSync } from "node:fs";

const sw = readFileSync("dist/client/sw.js", "utf8");
const assets = sw.match(/const PRECACHE_ASSETS = (\[[^\]]*\]);/);
if (!assets) {
  console.error("PRECACHE_ASSETS introuvable — injection non appliquée ?");
  process.exit(1);
}
const urls = JSON.parse(assets[1]);
const version = sw.match(/const CACHE_VERSION = "([^"]+)"/)?.[1];
const missing = urls.filter((u) => !existsSync("dist/client" + u));
console.log(
  `version: ${version} | assets précachés: ${urls.length} | manquants: ${missing.length}`,
);
if (missing.length) {
  console.log(missing.join("\n"));
  process.exit(1);
}
