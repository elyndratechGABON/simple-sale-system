// Le partage du SMS de paiement vers l'application (PWA).
//
// Ce que le test verrouille :
//  - le texte partagé est lu depuis l'URL (le manifeste déclare `share_target` en GET,
//    donc AUCUNE fonction serveur n'est nécessaire) ;
//  - certains systèmes mettent le contenu dans `text`, d'autres dans `title` : les deux
//    sont lus ;
//  - une URL sans partage ne renvoie rien (pas de faux positif).
import { describe, it, expect } from "vitest";
import { extractSharedSms } from "./share-target";

describe("SMS partagé vers l'application", () => {
  it("lit le texte partagé", () => {
    const sms = "Recu 10000F du 076505254,Client. Nouveau solde 99F. TID: TID-1.";
    expect(extractSharedSms(`?text=${encodeURIComponent(sms)}`)).toBe(sms);
  });

  it("accepte aussi le titre (certains systèmes l'emploient)", () => {
    const sms = "Recu 10000F du 076505254,Client. TID: TID-2.";
    expect(extractSharedSms(`?title=${encodeURIComponent(sms)}`)).toBe(sms);
  });

  it("une URL sans partage ne renvoie rien", () => {
    expect(extractSharedSms("")).toBeNull();
    expect(extractSharedSms("?page=pos")).toBeNull();
    expect(extractSharedSms("?text=")).toBeNull();
  });
});
