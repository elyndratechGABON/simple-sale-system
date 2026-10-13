import { useEffect, useState } from "react";
import { QrCode, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOpsRelayUrl, getOrchestratorUrl } from "@/lib/sync";
import { getPreferences } from "@/lib/settings";
import { announceDevice, generatePairingCode, pairCodeExpiry } from "@/lib/syncengine/pairing";
import type { ShopProfile } from "@/lib/db";
import type { AccountQuota } from "@/lib/gatekeeper";
import type { SyncIdentity } from "@/lib/syncengine/types";

interface QRBlockProps {
  open: boolean;
  hasNamePhone: boolean;
  identity: SyncIdentity | undefined;
  profile: ShopProfile | null | undefined;
  quota: AccountQuota | null | undefined;
  localDeviceCount: number;
  atCapacity: boolean;
  isOwner: boolean;
  pairCode: string | null;
  setPairCode: (value: string | null) => void;
  setCodeExpiry: (value: number | null) => void;
}

export function QRBlock({
  open,
  hasNamePhone,
  identity,
  profile,
  quota,
  localDeviceCount,
  atCapacity,
  isOwner,
  pairCode,
  setPairCode,
  setCodeExpiry,
}: QRBlockProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [qrErrorDetail, setQrErrorDetail] = useState<string | null>(null);

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte connu.
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

  return (
    <div className="space-y-4">
      {quota && (
        <div className="space-y-1 rounded-lg border bg-accent/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Appareils sur le compte</span>
            <Badge variant={atCapacity ? "destructive" : "secondary"} className="tabular-nums">
              {localDeviceCount} / {quota.maxDevices}
            </Badge>
          </div>
          {/* Le compteur local est instantané (1 écran + pairs approuvés) ; celui du
              serveur fait foi et peut le dépasser — un écran connu ailleurs, pas
              encore appairé ici. L'afficher évite « 1 / 3 » pendant que le serveur
              dit « 3 / 3 ». */}
          {quota.deviceCount > localDeviceCount && (
            <p className="text-xs text-muted-foreground">
              {quota.deviceCount} écran{quota.deviceCount > 1 ? "s" : ""} côté serveur — certains
              écrans de ce compte ne sont pas encore appairés ici.
            </p>
          )}
        </div>
      )}

      {atCapacity && (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Toutes les places du palier sont prises : le nouvel écran restera bloqué jusqu'à libérer
          une place ou monter de palier.
        </p>
      )}

      {isOwner && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
          <p className="text-sm font-medium text-foreground">Appareil employé</p>
          <p className="text-xs text-muted-foreground">
            Le code QR est destiné à un employé — le rôle « employé » est inscrit automatiquement.
            Aucune sélection n'est nécessaire.
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4">
        {/* Le QR suit la largeur disponible : figé à 224px, il était rogné
            dans une modale de 300px et moins. */}
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR d'appairage du compte marchand"
            className="aspect-square h-56 max-w-full rounded-lg object-contain"
          />
        ) : qrError ? (
          <div className="px-2 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              Relais injoignable : aucun QR ne peut être émis. Le mot de passe n'est jamais envoyé
              dans un QR — revenez quand le réseau est disponible.
            </p>
            {qrErrorDetail && <p className="mt-2 text-xs text-amber-600">{qrErrorDetail}</p>}
          </div>
        ) : (
          <div className="flex aspect-square h-56 w-full max-w-[224px] items-center justify-center rounded-lg border border-dashed">
            <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Ce code donne l'accès à la boutique{" "}
          <span className="font-medium text-foreground">
            {getPreferences().workspaceName || profile?.storeName || profile?.accountName}
          </span>{" "}
          ({profile?.accountPhone || profile?.phone}). L'employé le scanne, entre son nom, et reçoit
          le stock, les ventes et la caisse via le relais. Ne le montrez qu'à vos propres appareils.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Ce QR ne contient aucun mot de passe : un jeton de partage + le code temporaire. Sur son
        écran, l'employé saisit son nom puis le mot de passe temporaire ci-dessous.
      </p>
    </div>
  );
}
