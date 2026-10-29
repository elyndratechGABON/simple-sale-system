// L'abort client arrive parfois APRÈS la construction de la réponse : request.signal
// est encore propre, mais l'erreur capturée raconte l'abandon. `isClientAbort` doit
// s'attacher à cause n'importe quelle profondeur (undici « aborted » → Node ECONNRESET).
import { test, expect } from "vitest";
import { isClientAbort } from "./server";

const cause = (c: unknown) => ({ cause: c });

test("l'abort d'undici est reconnu à la profondeur où il vit", () => {
  const abort = new Error("aborted");
  const wrapped = new Error("request failed", cause(cause(abort)));
  expect(isClientAbort(wrapped)).toBe(true);
  expect(isClientAbort(abort)).toBe(true);
});

test("ECONNRESET est reconnu via le champ code", () => {
  const reset = Object.assign(new Error("socket closed"), { code: "ECONNRESET" });
  expect(isClientAbort(cause(reset) as unknown as Error)).toBe(true);
});

test("n'importe quoi d'autre n'est PAS un abort", () => {
  const real = new Error("Addition déjà réglée.");
  expect(isClientAbort(real)).toBe(false);
  const nested = new Error("x", cause(real));
  expect(isClientAbort(nested)).toBe(false);
  const junk = cause(42);
  expect(isClientAbort(junk)).toBe(false);
});
