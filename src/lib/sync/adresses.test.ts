// L'ordre d'essai des adresses est le cœur de la RÉSILIENCE de la caisse :
// l'instance locale d'abord (la copie de secours), le cloud ENSUITE (l'archive
// courante). Un service éteint ne doit pas rendre la récupération impossible.
import { beforeEach, describe, expect, it } from "vitest";
import { adressesRestore, erreurReseau } from "./adresses";
import { setLocalOrchestratorUrl } from "./local-server";

describe("adresses de restauration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("vise le cloud seul quand aucune instance locale n'est configurée", () => {
    expect(adressesRestore("https://cloud.example")).toEqual(["https://cloud.example"]);
  });

  it("essaie l'instance locale EN PREMIER, puis le cloud", () => {
    setLocalOrchestratorUrl("http://192.168.1.24:8788");
    expect(adressesRestore("https://cloud.example")).toEqual([
      "http://192.168.1.24:8788",
      "https://cloud.example",
    ]);
  });

  it("ne liste pas le cloud deux fois si le commerçant a saisi son adresse", () => {
    setLocalOrchestratorUrl("https://cloud.example");
    expect(adressesRestore("https://cloud.example")).toEqual(["https://cloud.example"]);
  });

  it("distingue une panne réseau d'un refus du service", () => {
    // Une connexion impossible : le service est éteint → on essaie le suivant.
    expect(erreurReseau(new TypeError("Failed to fetch"))).toBe(true);
    // Un délai dépassé : idem.
    const expire = new Error("timeout");
    expire.name = "AbortError";
    expect(erreurReseau(expire)).toBe(true);
    // Un refus du serveur : c'est une RÉPONSE, pas une panne → on ne change pas
    // de service, on rend le refus tel quel.
    expect(erreurReseau(new Error("Identifiants du compte incorrects."))).toBe(false);
  });
});
