// L'adresse de l'instance LOCALE n'est pas compilée dans l'application : elle change
// avec le réseau du commerce, et l'instance n'est allumée que par intermittence.
// Elle est donc saisie dans les paramètres et mémorisée sur l'appareil.
import { beforeEach, describe, expect, it } from "vitest";
import { getLocalOrchestratorUrl, setLocalOrchestratorUrl } from "./local-server";

describe("adresse de l'orchestrateur local", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("vaut vide par défaut (le cloud sert la restauration)", () => {
    expect(getLocalOrchestratorUrl()).toBe("");
  });

  it("est mémorisée et relue", () => {
    setLocalOrchestratorUrl("http://192.168.1.24:8788");
    expect(getLocalOrchestratorUrl()).toBe("http://192.168.1.24:8788");
  });

  it("normalise l'adresse (espaces et slash final)", () => {
    setLocalOrchestratorUrl("  http://192.168.1.24:8788/  ");
    expect(getLocalOrchestratorUrl()).toBe("http://192.168.1.24:8788");
  });

  it("se désactive quand on l'efface", () => {
    setLocalOrchestratorUrl("http://192.168.1.24:8788");
    setLocalOrchestratorUrl(null);
    expect(getLocalOrchestratorUrl()).toBe("");
  });

  it("une adresse vide ne remplace pas l'adresse enregistrée", () => {
    // Une chaîne vide NE DOIT pas effacer l'adresse : c'est le cas d'un champ
    // laissé vide par erreur au moment d'enregistrer.
    setLocalOrchestratorUrl("http://192.168.1.24:8788");
    setLocalOrchestratorUrl("");
    expect(getLocalOrchestratorUrl()).toBe("http://192.168.1.24:8788");
  });
});
