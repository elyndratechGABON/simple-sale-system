/**
 * Petit serveur statique pour la coquille SPA `dist/client` — même contrat que
 * Vercel : fichiers servis en direct, toute autre URL retombe sur index.html.
 * Usage : node tools/static-server.mjs [port] [racine]
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

const PORT = Number(process.argv[2] ?? 5200);
const ROOT = normalize(process.argv[3] ?? "dist/client");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    let file = join(ROOT, rel);
    let body;
    try {
      body = await readFile(file);
    } catch {
      // Fallback SPA : la coquille unique sert toutes les routes applicatives.
      file = join(ROOT, "index.html");
      body = await readFile(file);
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(body);
  } catch (e) {
    res.writeHead(500);
    res.end(String(e));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`static on http://127.0.0.1:${PORT}`));
