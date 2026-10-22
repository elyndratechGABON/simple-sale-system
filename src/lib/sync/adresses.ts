// Les adresses à interroger pour une RESTAURATION, et l'ordre dans lequel.
//
// La règle est simple et elle est le cœur de la résilience de la caisse :
// l'instance locale d'abord (c'est la copie de secours, servie chez le
// commerçant), le cloud ENSUITE (l'archive courante). Un service qui ne répond
// pas ne doit pas rendre la récupération impossible.
//
// Ce module est séparé de `restore.ts` pour être testable sans IndexedDB ni
// réseau : la logique d'essai est le comportement critique, pas l'affichage.

import { getLocalOrchestratorUrl } from "./local-server";

/**
 * Les adresses à essayer, dans l'ordre.
 *
 * @param cloudUrl l'adresse du cloud (celle compilée, ou le domaine de l'app).
 * @returns au moins une adresse : le cloud est toujours le filet de sécurité.
 */
export function adressesRestore(cloudUrl: string): string[] {
  const cloud = cloudUrl;
  const local = getLocalOrchestratorUrl();
  // L'instance locale n'est listée qu'une fois : si le commerçant a saisi
  // l'adresse du cloud, « local d'abord » n'est pas un doublon à re-tester.
  return local && local !== cloud ? [local, cloud] : [cloud];
}

/**
 * Une erreur RÉSEAU (le service est éteint ou injoignable), distinguée d'un refus
 * métier (401, 403, 500 — une RÉPONSE, donc pas une exception).
 *
 * `fetch` rejette avec une `TypeError` quand la connexion est impossible ; une
 * réponse HTTP, même 500, ne rejette jamais.
 */
export function erreurReseau(err: unknown): boolean {
  return err instanceof TypeError || (err as { name?: string })?.name === "AbortError";
}
