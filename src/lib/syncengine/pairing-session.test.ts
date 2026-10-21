// Le code de paire doit être UNIQUE par ouverture du dialogue QR, et IDENTIQUE à
// celui qui est stocké localement.
//
// Le défaut : le dialogue rejoue son effet, chaque passage sur `generatePairingCode`
// créait un code DIFFÉRENT, et le store local gardait le dernier pendant que le QR
// en affichait un autre. L'employé annonçait le code frappé au relais, le patron
// comparait au code qu'il croyait avoir — la preuve échouait, l'écran restait « à
// approuver » et n'apparaissait jamais dans « Caisses synchronisées ».
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { getDB, setShopAccount } from "../db";
import { generatePairingCode, sessionCode } from "./pairing";
import { PAIRING_KEYS } from "./types";
import { ACCOUNT, freshDevice } from "./sync-engine-helpers";

describe("code de session", () => {
  it("une session ouverte ne produit qu'un code, et c'est celui du store", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);

    const premier = await sessionCode(null);
    expect(premier).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    // Le code de session EST le code stocké : c'est lui que le patron compare à
    // l'annonce de l'employé.
    expect((await getDB().settings.get(PAIRING_KEYS.code))?.value).toBe(premier);

    // L'effet rejoué (double rendu React) : le code de session ne change pas et le
    // store n'est pas réécrit.
    const second = await sessionCode(premier);
    expect(second).toBe(premier);
    expect((await getDB().settings.get(PAIRING_KEYS.code))?.value).toBe(premier);
  });

  it("une nouvelle session repart d'un code neuf", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const premier = await sessionCode(null);
    // Session refermée : le dialogue repart de zéro → un autre code.
    const suivant = await sessionCode(null);
    expect(suivant).not.toBe(premier);
    expect((await getDB().settings.get(PAIRING_KEYS.code))?.value).toBe(suivant);
  });

  it("le code généré directement reste un code neuf (usage unique)", async () => {
    await freshDevice();
    await setShopAccount(ACCOUNT);
    const a = await generatePairingCode();
    const b = await generatePairingCode();
    expect(a).not.toBe(b);
  });

  it("le dialogue QR ne frappe AU RELAIS qu'un seul code", () => {
    // Garde-fou sur la source : le défaut était un DEUXIÈME `generatePairingCode()`
    // dans le corps de la frappe au relais (`pairCode ?? generatePairingCode()`), qui
    // créait un code différent ET écrasait celui du store local. Le jeton frappé et le
    // QR doivent porter le code de session.
    const src = readFileSync(
      new URL("../../components/pairing/useQrPayload.ts", import.meta.url),
      "utf8",
    );
    expect(src).not.toMatch(/generatePairingCode\(/);
    expect(src).toMatch(/pair_code: code/);
  });
});
