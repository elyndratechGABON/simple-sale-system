// L'empreinte doit distinguer deux APPAREILS, pas seulement deux fenêtres : c'est
// exactement le cas qui faisait échouer l'inscription (deux téléphones de gamme
// courant, même Chrome, même résolution en pixels CSS, donc même hash, donc 409).
import { describe, expect, it } from "vitest";
import { fingerprintInput, type FingerprintSignals } from "./device-fingerprint";

// User-agent Chrome Android RÉDUIT : « Android 10; K » pour tous les modèles.
const base: FingerprintSignals = {
  userAgent:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  platform: "Linux armv8l",
  screen: "360x800x24",
  timeZone: "Africa/Libreville",
  cores: "8",
  language: "fr",
  pixelRatio: "3",
  touchPoints: "5",
  deviceMemory: "4",
  clientHints: "",
};

describe("fingerprintInput", () => {
  it("est stable pour un même appareil", () => {
    expect(fingerprintInput(base)).toBe(fingerprintInput({ ...base }));
  });

  it("distingue deux téléphones dès que le modèle est lisible (client hints)", () => {
    const samsung = { ...base, clientHints: "Android|SM-A105F|13" };
    const tecno = { ...base, clientHints: "Android|TECNO SPARK 8|13" };
    expect(fingerprintInput(samsung)).not.toBe(fingerprintInput(tecno));
  });

  it("distingue mémoire et points de contact même sans client hints", () => {
    expect(fingerprintInput({ ...base, deviceMemory: "2" })).not.toBe(fingerprintInput(base));
    expect(fingerprintInput({ ...base, touchPoints: "0" })).not.toBe(fingerprintInput(base));
  });

  it("ne confond pas deux paires de signaux voisins (le séparateur compte)", () => {
    // Sans séparateur, ("", "fr4") et ("fr", "4") hacheraient pareil.
    expect(fingerprintInput({ ...base, language: "", deviceMemory: "4" })).not.toBe(
      fingerprintInput({ ...base, language: "fr", deviceMemory: "" }),
    );
  });

  it("porte sa version : une empreinte v1 n'est pas relue comme une v2", () => {
    expect(fingerprintInput(base)).toContain("v2");
  });

  it("limite connue : sans client hints, deux profils identiques restent indistinguables", () => {
    // Un navigateur qui n'expose pas le modèle ne peut pas séparer deux téléphones au
    // même profil. C'est le prix de la discrétion ; le garde-fou reste efficace sur
    // Chrome, qui expose le modèle.
    expect(fingerprintInput({ ...base })).toBe(fingerprintInput({ ...base }));
  });
});
