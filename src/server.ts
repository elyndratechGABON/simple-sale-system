import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  // En DEV, un rechargement/onglet fermé coupe la connexion EN PLEIN SSR (ECONNRESET) :
  // h3 rend alors le même 500 avalé. Le client est déjà parti — rien à journaliser,
  // rien de plus à lui renvoyer ; rendre une page d'erreur serait du bruit.
  if (request.signal?.aborted) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;
  // L'abort arrive parfois APRÈS la construction de la réponse : request.signal est
  // encore propre, mais l'erreur capturée (`unhandledrejection`) raconte l'abandon —
  // cause `aborted` / ECONNRESET. Client parti : pas d'impression, pas de page d'erreur.
  const captured = consumeLastCapturedError();
  if (captured && isClientAbort(captured)) return response;

  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** Erreur d'abandon client : « aborted » posé par undici, ECONNRESET par Node. */
export function isClientAbort(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 10; depth += 1) {
    if (current instanceof Error) {
      if (current.message === "aborted") return true;
      const code = (current as Error & { code?: unknown }).code;
      if (code === "ECONNRESET") return true;
      current = (current as Error & { cause?: unknown }).cause;
      continue;
    }
    // Cause intermédiaire non-Error ({ cause: ... }) : on continue à traverser.
    if (typeof current === "object" && current !== null) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    return false;
  }
  return false;
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
