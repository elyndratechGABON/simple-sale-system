// Environnement de test du moteur de synchronisation (uniquement node).
//
//  - `fake-indexeddb/auto` installe un IndexedDB en mémoire dans le contexte global ;
//  - `getDB()` exige un `window`, fourni ici en lui donnant le contexte node ;
//  - `resetDBForTests` + `resetIdentityForTests` isolent chaque scénario : la base est
//    supprimée, l'identité oubliée → chaque test repart d'un appareil neuf.
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { resetDBForTests } from "../../db";
import { resetIdentityForTests } from "../identity";

if (!("window" in globalThis)) {
  (globalThis as Record<string, unknown>).window = globalThis;
}

afterEach(async () => {
  await resetDBForTests();
  resetIdentityForTests();
});
