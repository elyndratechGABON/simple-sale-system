import { useEffect, useState } from "react";
import { getOpsRelayUrl, getOrchestratorUrl } from "@/lib/sync";
import { getPreferences } from "@/lib/settings";
import { announceDevice, generatePairingCode, pairCodeExpiry } from "@/lib/syncengine/pairing";
import type { ShopProfile } from "@/lib/db";
import type { SyncIdentity } from "@/lib/syncengine/types";

interface UseQrPayloadArgs {
  open: boolean;
  hasNamePhone: boolean;
  identity: SyncIdentity | undefined;
  profile: ShopProfile | null | undefined;
  pairCode: string | null;
  setPairCode: (value: string | null) => void;
  setCodeExpiry: (value: number | null) => void;
}

export function useQrPayload({
  open,
  hasNamePhone,
  identity,
  profile,
  pairCode,
  setPairCode,
  setCodeExpiry,
}: UseQrPayloadArgs) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [qrErrorDetail, setQrErrorDetail] = useState<string | null>(null);

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte connu.
  // exhaustive-deps ignoré volontairement : ajouter profile/identity à la liste de
  // dépendances ferait régénérer le QR à chaque refetch (comportement pré-existant).
  useEffect(() => {
    if (!open || !hasNamePhone) return;
    let cancelled = false;
    setQrError(false);
    setQrErrorDetail(null);
    void (async () => {
      try {
        // Le QR transporte désormais un code de confirmation TEMPORAIRE (code de paire
        // P2P) : le scanner s'annonce avec lui et le principal le reconnaît d'office.
        // On garantit un code frais actif avant de fabriquer le QR.
        if (pairCode === null) {
          const code = await generatePairingCode();
          if (!cancelled) {
            setPairCode(code);
            setCodeExpiry(await pairCodeExpiry());
          }
          await announceDevice().catch(() => {});
        }
        if (cancelled) return;
        // Jeton de partage : frappe au relais (pas de mot de passe dans le QR).
        // Si le relais est inaccessible, aucun QR n'est émis : le mot de passe ne
        // doit JAMAIS se retrouver dans un QR.
        let token = null;
        try {
          const relayUrl = (
            getOpsRelayUrl ? getOpsRelayUrl() : (getOrchestratorUrl() ?? "")
          ).replace(/\/$/, "");
          // Un cold start du relais (serverless) peut jeter la première requête :
          // on réessaie une fois avant de déclarer l'émission impossible.
          for (let attempt = 0; attempt < 2 && token === null; attempt++) {
            const mintRes = await fetch(relayUrl + "/api/v1/share/mint", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-ops-token":
                  typeof import.meta.env?.VITE_OPS_TOKEN === "string"
                    ? import.meta.env.VITE_OPS_TOKEN
                    : "",
              },
              body: JSON.stringify({
                shop_id: identity?.shopId ?? "",
                // Repli TRUTHY (||) : un champ vide ("" mais défini) doit laisser la place
                // au téléphone/nom de la fiche Boutique — sinon le relais répond 400.
                account_name: profile?.accountName || profile?.storeName || "",
                account_phone: profile?.accountPhone || profile?.phone || "",
                pair_code: pairCode ?? generatePairingCode(),
              }),
            });
            if (mintRes.ok) {
              const mintData = await mintRes.json();
              token = mintData.token;
            } else {
              // Distinguer un rejet du relais d'un simple problème de réseau : un 401/400
              // trahit presque toujours une VERSION ANCIENNE de l'app (bundle périmé en cache)
              // qui ne parle plus le contrat actuel — la solution est de recharger l'app.
              let serverError = "";
              try {
                const data = await mintRes.json();
                serverError = typeof data?.error === "string" ? data.error : "";
              } catch {
                /* réponse non JSON */
              }
              if (mintRes.status === 401) {
                setQrErrorDetail(
                  "Le serveur a refusé l'identifiant de cette caisse (401). Ouvrez les réglages →" +
                    " «À propos» ou rechargez l'application complètement : une version ancienne" +
                    " gardée en mémoire ne sait plus émettre de QR.",
                );
              } else {
                setQrErrorDetail(
                  `Le serveur a refusé la demande (${mintRes.status})${serverError ? ` : ${serverError}` : ""}.` +
                    " Rechargez l'application complètement pour la dernière version.",
                );
              }
              if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
            }
          }
        } catch {
          /* relay hors ligne → pas de token → aucun QR émis (jamais de mot de passe) */
        }
        let text: string | null = null;
        if (token && pairCode) {
          // QR du jeton (v2) : pas de password, juste le token + pair_code + role=employee.
          // La copie boutique (shop) part TOUJOURS : l'employé doit recevoir le vrai nom de
          // la boutique (sinon il reste "Ma boutique"). storeName : le `workspaceName`
          // d'abord (le nom saisi à la création y vit), la fiche profil ensuite — la fiche
          // a pu rester sur le fallback si l'onboarding ne l'avait jamais écrite.
          const prefs = getPreferences();
          const shopStoreName = prefs.workspaceName || profile?.storeName || "";
          const payload = {
            v: 2,
            app: "ecaisse" as const,
            url: getOrchestratorUrl() ?? "",
            token,
            name: prefs.workspaceName || profile?.storeName || profile?.accountName || "",
            // `||` (pas `??`) : accountPhone peut être défini à "" (compte créé sans saisie) —
            // un `??` garderait la chaîne vide et l'écran scanné partirait SANS compte,
            // donc sans groupe partagé (stock jamais reçu, import « n'attachée à aucun compte »).
            account_phone: profile?.accountPhone || profile?.phone || "",
            pair_code: pairCode,
            role: "employee" as const,
            ...(shopStoreName
              ? {
                  shop: {
                    storeName: shopStoreName,
                    ownerName: profile?.ownerName ?? prefs.ownerName ?? "",
                    phone: profile?.phone || prefs.phone || "",
                    quarter: profile?.location ?? prefs.quarter ?? "",
                    cluster: prefs.cluster ?? "restaurant",
                    customDomain: prefs.customDomain ?? "",
                    customUnitType: prefs.customUnitType ?? "unit",
                    tablesEnabled: prefs.tablesEnabled ?? false,
                  },
                }
              : {}),
          };
          text = JSON.stringify(payload);
        }
        if (!text) throw new Error("relay-required");
        const { default: QRCode } = await import("qrcode");
        const url = await QRCode.toDataURL(text, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, hasNamePhone, pairCode, setPairCode, setCodeExpiry]);

  return { qrDataUrl, qrError, qrErrorDetail };
}
