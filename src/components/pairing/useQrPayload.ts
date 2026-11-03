import { useEffect, useRef, useState } from "react";
import { getOpsRelayUrl, getOrchestratorUrl } from "@/lib/sync";
import { getPreferences } from "@/lib/settings";
import { announceDevice, pairCodeExpiry, sessionCode } from "@/lib/syncengine/pairing";
import { ensureIdentity, getDeviceKeys } from "@/lib/syncengine/identity";
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
  // Le code de la session en cours : UN SEUL par ouverture de dialogue (cf.
  // `sessionCode`). L'effet peut se rejouer ; chaque génération produirait un code
  // différent, et le patron ne reconnaîtrait jamais celui que l'employé annonce.
  const codeRef = useRef<string | null>(null);

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte connu.
  // exhaustive-deps ignoré volontairement : ajouter profile/identity à la liste de
  // dépendances ferait régénérer le QR à chaque refetch (comportement préexistant).
  useEffect(() => {
    // Fermeture : la session de code est finie. La réouverture repartira d'un code
    // neuf — et d'un seul (cf. `sessionCode`).
    if (!open) {
      codeRef.current = null;
      return;
    }
    if (!hasNamePhone) return;
    let cancelled = false;
    setQrError(false);
    setQrErrorDetail(null);
    void (async () => {
      try {
        // Le QR porte un code de confirmation TEMPORAIRE (code de paire P2P) : le
        // scanner s'annonce avec lui et le principal le reconnaît d'office.
        //
        // UN SEUL code par ouverture : le dialogue peut rejouer son effet, et chaque
        // génération crée un code différent. Le code de session est celui qu'on AFFICHE,
        // qu'on frappe au relais et qu'on compare à l'annonce de l'employé — les trois
        // doivent être le même, sinon le patron ne reconnaît jamais personne.
        const code = await sessionCode(codeRef.current);
        codeRef.current = code;
        if (!cancelled) {
          setPairCode(code);
          setCodeExpiry(await pairCodeExpiry());
        }
        await announceDevice().catch(() => {});
        if (cancelled) return;
        const ownerIdentity = await ensureIdentity();
        const ownerPublicKey = getDeviceKeys().publicKey;
        // META du jeton (mission QR léger) : fiche boutique + clé publique frappées
        // AU RELAIS au moment du mint, rendues au redeem — le QR ne les porte plus.
        const prefs = getPreferences();
        const shopStoreName = prefs.workspaceName || profile?.storeName || "";
        let meta: {
          public_key: string;
          owner_device_id: string;
          shop: Record<string, unknown>;
        } | null = null;
        if (shopStoreName) {
          const shop: Record<string, unknown> = {
            storeName: shopStoreName,
            tablesEnabled: prefs.features?.tables ?? prefs.tablesEnabled ?? false,
          };
          const ownerName = profile?.ownerName ?? prefs.ownerName ?? "";
          if (ownerName) shop.ownerName = ownerName;
          const shopPhone = profile?.phone || prefs.phone || "";
          if (shopPhone) shop.phone = shopPhone;
          const quarter = profile?.location ?? prefs.quarter ?? "";
          if (quarter) shop.quarter = quarter;
          // Cluster : ABSENT = « restaurant » (le récepteur garde son fallback) ;
          // toute autre activité, avec ses réglages personnalisés, doit voyager.
          if (prefs.cluster && prefs.cluster !== "restaurant") {
            shop.cluster = prefs.cluster;
            if (prefs.cluster === "personnalise") {
              if (prefs.customDomain) shop.customDomain = prefs.customDomain;
              if (prefs.customUnitType && prefs.customUnitType !== "unit") {
                shop.customUnitType = prefs.customUnitType;
              }
            }
          }
          meta = {
            public_key: ownerPublicKey,
            owner_device_id: ownerIdentity.deviceId,
            shop,
          };
        }
        // Jeton de partage : frappe au relais (pas de mot de passe dans le QR).
        // Si le relais est inaccessible, aucun QR n'est émis : le mot de passe ne
        // doit JAMAIS se retrouver dans un QR.
        let token = null;
        const relayUrl = (getOpsRelayUrl ? getOpsRelayUrl() : (getOrchestratorUrl() ?? "")).replace(
          /\/$/,
          "",
        );
        try {
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
                // LE code de session : le jeton frappé et le QR doivent porter le même
                // code que celui que le patron compare à l'annonce de l'employé.
                pair_code: code,
                ...(meta ? { meta } : {}),
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
        if (token && code) {
          // QR v3 ULTRA-LÉGER : juste le jeton, le groupe, le code de session et
          // l'adresse du relais — la fiche et la clé publique sont rendues au redeem
          // (meta frappé ci-dessus). ~90 caractères au lieu de ~600 : le scan devient
          // instantané sur n'importe quel portable.
          text = JSON.stringify({
            v: 3,
            app: "ecaisse" as const,
            url: relayUrl,
            token,
            shop_id: identity?.shopId ?? "",
            pair_code: code,
          });
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
