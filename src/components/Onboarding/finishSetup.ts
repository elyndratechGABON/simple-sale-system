import { toast } from "sonner";
import { addEmployeeHistory, ensureEmployeeId, setShopAccount, saveShopProfile } from "@/lib/db";
import { joinByKeyword } from "@/lib/gatekeeper";
import { savePreferences } from "@/lib/settings";
import { enterPairingCode } from "@/lib/syncengine/pairing";
import { ensureIdentity, setIdentityRole } from "@/lib/syncengine/identity";
import type { SetupWizardApi } from "./useSetupWizard";

/**
 * Clôture de l'assistant : crée/charge l'identité, force le rôle employé en mode
 * « join », applique les identifiants du compte, sauvegarde le profil et les
 * préférences, puis annonce l'écran au groupe P2P.
 */
export async function finishSetup(w: SetupWizardApi): Promise<void> {
  const store = w.name.trim() || "Ma boutique";
  const owner = w.ownerName.trim();

  // PHASE 1: Créer/charger identité AVANT toute autre opération. Cela garantit que
  // l'identité existe et peut être modifiée avant d'être utilisée par setShopAccount().
  const identity = await ensureIdentity();

  // PHASE 2: Mode « join » (employé qui rejoint) → rôle employee IMMÉDIATEMENT.
  if (w.accountMode === "join") {
    await setIdentityRole("employee");
  }

  // PHASE 3: Valider et appliquer les identifiants du compte.
  if (w.accountMode === "join" && w.accKeyword.trim() && !(w.accPhone.trim() && w.accPassword)) {
    // Voie « mot clé » (jonction sans téléphone/mot de passe) : vérification côté
    // serveur. Hors ligne → mode provisoire 48 h ; mot clé rejeté → blocage dur.
    await setShopAccount({ name: store, phone: "", password: "", ownerName: owner });
    const result = await joinByKeyword({
      storeName: store,
      ownerName: owner,
      keyword: w.accKeyword.trim(),
    });
    if (result.status === "blocked") {
      toast.error(
        "Mot clé invalide : aucun compte ne correspond à ce nom, ce propriétaire et ce mot clé.",
      );
      w.setAccKeyword("");
      return;
    }
    if (result.status === "pending") {
      toast.info(
        "Serveur injoignable — la vérification reprendra automatiquement au retour du réseau (48 h max).",
      );
    }
  } else {
    // Le nom du COMPTE doit être celui du principal (lu dans le QR), PAS l'enseigne :
    // le `shopId` P2P en dérive.
    await setShopAccount({
      name: w.accAccountName.trim() || store,
      phone: w.accPhone.trim(),
      password: w.accPassword,
      ownerName: owner,
    });
  }

  // Fiche `shop_profiles` = l'enseigne validée (même source que `prefs`).
  await saveShopProfile({
    storeName: store,
    ownerName: owner,
    phone: w.phone.trim(),
    location: w.quarter.trim(),
  });

  // PHASE 4: Annoncer au groupe P2P avec le rôle correct (employee). S'annonce avec le
  // code de confirmation temporaire lu dans le QR : le principal le reconnaît `paired`.
  if (w.pairCode && w.accPhone.trim() && w.accPassword) {
    const pairing = await enterPairingCode(w.pairCode).catch(() => "invalid" as const);
    if (pairing === "invalid") {
      toast.warning("Compte créé, mais le code temporaire n'a pas été accepté.", {
        description:
          "Rejoignez l'autre caisse dans Réglages → Appareils avec le bon code (6 caractères).",
      });
    }
  }

  // PHASE 5: Carnet d'expérience (employé seulement). Un mobile qui REJOINT un compte
  // existant est une personne qui commence une expérience dans ce business.
  if (w.accountMode === "join") {
    await addEmployeeHistory({
      employeeId: ensureEmployeeId(),
      deviceId: identity.deviceId,
      shopId: identity.shopId,
      storeName: store,
      cluster: w.selectedCluster ?? "restaurant",
    });
  }

  // PHASE 6: Sauvegarder préférences et invalider caches.
  savePreferences({
    workspaceName: store,
    phone: w.phone.trim(),
    quarter: w.quarter.trim(),
    ownerName: w.ownerName.trim(),
    cluster: w.selectedCluster ?? "restaurant",
    customDomain: w.selectedCluster === "personnalise" ? w.customDomain.trim() : "",
    customUnitType:
      w.selectedCluster === "personnalise" ? (w.customStockChoice ?? "unit") : undefined,
    tablesEnabled: w.clusterConfig?.workflow.hasTables ?? false,
    onboarded: true,
    privacyAccepted: w.privacyAccepted,
  });
  w.qc.invalidateQueries({ queryKey: ["preferences"] });
  w.onComplete();
}
