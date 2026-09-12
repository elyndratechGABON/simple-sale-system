// Appairage d'un écran supplémentaire : le QR affiché contient les identifiants du
// compte marchand. La nouvelle caisse le scanne (bouton « Scanner le QR » du mode
// « Rejoindre » à l'onboarding) et rejoint le compte au premier handshake.
//
// Le QR est généré à la demande (import dynamique de `qrcode`) : rien dans le bundle
// principal, rien en réseau — tout reste local. Le payload embarquant le mot de passe,
// le dialogue le rappelle explicitement : à ne montrer qu'à ses propres appareils.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, QrCode, TriangleAlert, Users } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getOpsRelayUrl, getOrchestratorUrl } from "@/lib/sync";
import { getPreferences } from "@/lib/settings";
import { getAccountQuota } from "@/lib/gatekeeper";
import { getShopProfile } from "@/lib/db";
import {
  ensureIdentity,
  setIdentityEmployeeName,
  setIdentityRole,
} from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import {
  announceDevice,
  approveDevice,
  enterPairingCode,
  generatePairingCode,
  getActivePairingCode,
  pairCodeExpiry,
  ROLE_LABELS,
} from "@/lib/syncengine/pairing";
import type { DeviceRole } from "@/lib/syncengine/types";

interface DevicePairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevicePairingDialog({ open, onOpenChange }: DevicePairingDialogProps) {
  const qc = useQueryClient();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);
  const [enteredCode, setEnteredCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
    enabled: open,
  });
  const { data: quota } = useQuery({
    queryKey: ["account_quota"],
    queryFn: getAccountQuota,
    enabled: open,
  });
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    enabled: open,
  });
  const { data: peers } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: open && Boolean(identity),
  });

  const hasNamePhone = Boolean(
    (profile?.accountPhone || profile?.phone) && (profile?.accountName || profile?.storeName),
  );
  // Identifiants complets (téléphone + mot de passe) : seuls ceux qui les détiennent
  // voient la fiche « Compte marchand » avec le mot de passe.
  const hasCredentials = Boolean(profile?.accountPhone && profile.accountPassword);
  const hasKeywordOnly = Boolean(profile?.accountKeyword) && !hasCredentials;
  const hasAnyAccount = hasNamePhone || hasKeywordOnly;
  const atCapacity = quota ? quota.deviceCount >= quota.maxDevices : false;
  const isOwner = identity?.role === "owner";
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const pairedCount = (peers ?? []).filter((p) => p.status !== "pending").length;
  const minutesLeft = codeExpiry ? Math.max(0, Math.ceil((codeExpiry - Date.now()) / 60_000)) : 0;

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte connu.
  useEffect(() => {
    if (!open || !hasNamePhone) return;
    let cancelled = false;
    setQrError(false);
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
              account_name: profile?.accountName ?? profile?.storeName ?? "",
              account_phone: profile?.accountPhone ?? profile?.phone ?? "",
              pair_code: pairCode ?? generatePairingCode(),
            }),
          });
          if (mintRes.ok) {
            const mintData = await mintRes.json();
            token = mintData.token;
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
            name: profile?.accountName ?? profile?.storeName ?? prefs.workspaceName ?? "",
            account_phone: profile?.accountPhone ?? profile?.phone ?? "",
            pair_code: pairCode,
            role: "employee" as const,
            ...(shopStoreName
              ? {
                  shop: {
                    storeName: shopStoreName,
                    ownerName: profile?.ownerName ?? prefs.ownerName ?? "",
                    phone: profile?.phone ?? prefs.phone ?? "",
                    quarter: profile?.location ?? prefs.quarter ?? "",
                    cluster: prefs.cluster ?? "retail",
                    subCategory: prefs.subCategory ?? undefined,
                    customDomain: prefs.customDomain ?? "",
                    customUnitType: prefs.customUnitType ?? "unit",
                    businessType: prefs.businessType ?? "retail",
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
  }, [open, hasNamePhone, pairCode]);

  // Code de paire : recharger le code actif (et son expiration) à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [code, expiry] = await Promise.all([getActivePairingCode(), pairCodeExpiry()]);
      if (!cancelled) {
        setPairCode(code);
        setCodeExpiry(expiry);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Nom affiché : reprendre celui de l'identité dès qu'elle est chargée.
  useEffect(() => {
    if (identity) setEmployeeName(identity.employeeName);
  }, [identity]);

  async function submitPairCode() {
    const result = await enterPairingCode(enteredCode);
    if (result === "invalid") {
      toast.error("Code invalide : 6 caractères (sans O, I, 0, 1 ni 8).");
      return;
    }
    setEnteredCode("");
    toast.success("Demande envoyée — le principal l'accepte au prochain échange.");
    setInfoOpen(true);
  }

  async function changeRole(role: DeviceRole) {
    await setIdentityRole(role);
    toast.success(`Cet écran est désormais : ${ROLE_LABELS[role]}.`);
    await qc.invalidateQueries({ queryKey: ["sync_identity"] });
  }

  async function saveName() {
    const trimmed = employeeName.trim();
    await setIdentityEmployeeName(trimmed);
    if (trimmed) toast.success(`Nom affiché : ${trimmed}`);
  }

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5" />
            Ajouter un appareil
          </DialogTitle>
          <DialogDescription>
            L'employé scanne ce code, entre son nom, et reçoit le stock, les ventes et la caisse du
            propriétaire via le relais.
          </DialogDescription>
        </DialogHeader>

        {hasNamePhone ? (
          <div className="space-y-4">
            {quota && (
              <div className="flex items-center justify-between rounded-lg border bg-accent/50 px-3 py-2">
                <span className="text-sm text-muted-foreground">Appareils sur le compte</span>
                <Badge variant={atCapacity ? "destructive" : "secondary"} className="tabular-nums">
                  {quota.deviceCount} / {quota.maxDevices}
                </Badge>
              </div>
            )}

            {atCapacity && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Toutes les places du palier sont prises : le nouvel écran restera bloqué jusqu'à
                libérer une place ou monter de palier.
              </p>
            )}

            {isOwner && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">Appareil employé</p>
                <p className="text-xs text-muted-foreground">
                  Le code QR est destiné à un employé — le rôle « employé » est inscrit
                  automatiquement. Aucune sélection n'est nécessaire.
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
                <p className="px-2 py-16 text-center text-sm text-muted-foreground">
                  Relais injoignable : aucun QR ne peut être émis. Le mot de passe n'est jamais
                  envoyé dans un QR — revenez quand le réseau est disponible.
                </p>
              ) : (
                <div className="flex aspect-square h-56 w-full max-w-[224px] items-center justify-center rounded-lg border border-dashed">
                  <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Ce code donne l'accès à la boutique{" "}
                <span className="font-medium text-foreground">
                  {profile?.storeName || profile?.accountName}
                </span>{" "}
                ({profile?.accountPhone || profile?.phone}). L'employé le scanne, entre son nom, et
                reçoit le stock, les ventes et la caisse via le relais. Ne le montrez qu'à vos
                propres appareils.
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Ce QR ne contient aucun mot de passe : un jeton de partage + le code temporaire. Sur
              son écran, l'employé saisit son nom puis le mot de passe temporaire ci-dessous.
            </p>
          </div>
        ) : profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte{" "}
            <span className="font-medium text-foreground">par mot clé de récupération</span> : il
            n'a pas le téléphone ni le nom du compte, que le QR transporte. Depuis un écran qui
            détient le compte (téléphone + mot de passe), ouvrez ici « Ajouter un appareil » pour
            partager le code QR.
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet appareil n'a pas encore d'identité marchande : renseignez le nom de la{" "}
            <span className="font-medium text-foreground">boutique</span> et son{" "}
            <span className="font-medium text-foreground">téléphone</span> (Réglages → Boutique)
            avant d'afficher un code QR.
          </p>
        )}

        {hasAnyAccount && (
          <div className="space-y-3 rounded-xl border p-4">
            {isOwner && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  L'employé scanne le QR, entre son nom puis le mot de passe temporaire ci-dessous :
                  il est ajouté à la boutique.
                </p>
                {pairCode && (
                  <div className="rounded-lg border border-dashed bg-accent/40 py-3 text-center">
                    <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pairCode}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mot de passe temporaire, valable {minutesLeft} min — à saisir par l'employé
                      sous son nom.
                    </p>
                  </div>
                )}
              </div>
            )}

            {isOwner && pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  En attente d'approbation ({pending.length})
                </p>
                {pending.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-accent/30 px-3 py-2"
                  >
                    <span className="truncate text-sm">
                      {p.device_name || "Écran inconnu"}
                      <span className="ml-1 text-xs text-muted-foreground">
                        · {p.id.slice(0, 6)}…
                      </span>
                    </span>
                    <Button type="button" size="sm" onClick={() => void approve(p.id)}>
                      Approuver
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {peers && (
              <p className="text-xs text-muted-foreground">
                {pairedCount > 0
                  ? `${pairedCount} employé${pairedCount > 1 ? "s" : ""} connecté${pairedCount > 1 ? "s" : ""} à cette boutique.`
                  : "Aucun employé connecté pour l'instant. Partagez le QR ci-dessus."}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
