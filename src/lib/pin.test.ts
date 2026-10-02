// Le PIN est la garde des actions à effet financier (annulation d'une vente encaissée,
// annulation d'une table). Ce que ces tests verrouillent, ce sont les propriétés qui
//justifient PBKDF2 + limitation : pas de code devinable par défaut, pas de code en
// clair sur l'appareil, et une énumération qui se heurte à un verrou.
import { beforeEach, describe, expect, it } from "vitest";
import { isPinSet, pinLockRemainingMs, resetPin, setPin, verifyPin } from "./pin";

// `pin.ts` travaille sur `window.localStorage` et sur `crypto.subtle` : les deux
// existent en node, il n'y a donc rien à mocker. On ne fait qu'un `localStorage` propre
// entre chaque test.
beforeEach(() => {
  if (!("window" in globalThis)) (globalThis as Record<string, unknown>).window = globalThis;
  if (!globalThis.window.localStorage) {
    // L'environnement de test du moteur ne pose qu'un `window` sans DOM : on fournit
    // le `localStorage` minimal dont le module a besoin.
    const store = new Map<string, string>();
    globalThis.window.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    } as unknown as Storage;
  }
  resetPin();
});

describe("code PIN d'annulation", () => {
  it("n'a AUCUN code par défaut : un PIN non choisi n'est pas 1234", async () => {
    expect(isPinSet()).toBe(false);
    // Le défaut historique acceptait « 1234 » sur une caisse jamais configurée.
    expect(await verifyPin("1234")).toBe("unset");
    expect(await verifyPin("")).toBe("unset");
  });

  it("accepte le code posé et refuse les autres", async () => {
    await setPin("4821");
    expect(isPinSet()).toBe(true);
    expect(await verifyPin("4821")).toBe("ok");
    expect(await verifyPin("4822")).toBe("wrong");
    expect(await verifyPin("0000")).toBe("wrong");
  });

  it("ne stocke jamais le code en clair", async () => {
    await setPin("7391");
    const raw = JSON.stringify(window.localStorage);
    expect(raw).not.toContain("7391");
    // Le sel et le hash, lui, sont bien là.
    expect(window.localStorage.getItem("pos_admin_pin_hash")).toMatch(
      /^[0-9a-f]{32}:[0-9a-f]{64}$/,
    );
  });

  it("utilise un sel distinct à chaque changement de code", async () => {
    await setPin("1111");
    const first = window.localStorage.getItem("pos_admin_pin_hash")!;
    await setPin("1111");
    const second = window.localStorage.getItem("pos_admin_pin_hash")!;
    expect(second).not.toBe(first);
    // Même code, hash différent — sans quoi deux appareils alignés.
    expect(await verifyPin("1111")).toBe("ok");
  });

  it("bloque à la cinquième tentative, et le verrou tient même sur le bon code", async () => {
    await setPin("2468");
    for (let i = 0; i < 4; i++) {
      expect(await verifyPin("0000")).toBe("wrong");
    }
    // La 5e tentative pose le verrou et le signale : l'interface propose d'attendre
    // plutôt que de ressaisir un code qui ne serait pas lu.
    expect(await verifyPin("0000")).toBe("locked");
    // Le verrou est posé : même le BON code est refusé.
    expect(await verifyPin("2468")).toBe("locked");
    expect(await verifyPin("2468")).toBe("locked");
    expect(pinLockRemainingMs()).toBeGreaterThan(0);
  });

  it("remet le compteur à zéro après un code correct", async () => {
    await setPin("2468");
    await verifyPin("0000");
    await verifyPin("0000");
    expect(await verifyPin("2468")).toBe("ok");
    // Le compteur est purgé : deux erreurs de plus ne bloquent pas.
    await verifyPin("0000");
    await verifyPin("0000");
    expect(await verifyPin("2468")).toBe("ok");
  });

  it("rouvre la saisie après resetPin — un oubli ne bloque pas la caisse", async () => {
    await setPin("9999");
    expect(await verifyPin("9999")).toBe("ok");
    resetPin();
    expect(isPinSet()).toBe(false);
    expect(await verifyPin("9999")).toBe("unset");
  });
});
