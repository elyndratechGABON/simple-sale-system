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
import { buildPairingPayload } from "@/lib/pairing";
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
  clearPairingCode,
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
  // Rôle assigné par le propriétaire au futur appareil (inscrit dans le QR).
  const [shareRole, setShareRole] = useState<DeviceRole>("employee");

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

  const hasAccount = Boolean(profile?.accountPhone && profile.accountPassword);
  const hasKeywordOnly = Boolean(profile?.accountKeyword) && !hasAccount;
  const hasAnyAccount = hasAccount || hasKeywordOnly;
  const atCapacity = quota ? quota.deviceCount >= quota.maxDevices : false;
  const isOwner = identity?.role === "owner";
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const pairedCount = (peers ?? []).filter((p) => p.status !== "pending").length;
  const minutesLeft = codeExpiry ? Math.max(0, Math.ceil((codeExpiry - Date.now()) / 60_000)) : 0;

  // Génération paresseuse : seulement quand le dialogue s'ouvre avec un compte.
  useEffect(() => {
    if (!open || !hasAccount) return;
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
        // Si le relais est inaccessible, on revient au QR classique (compat).
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
          /* relay hors ligne → fallback QR classic */
        }
        let text: string | null = null;
        if (!token && pairCode) {
          // fallback : QR ancien (compat) — le mot de passe reste sur cet écran
          const legacy = await buildPairingPayload(shareRole);
          if (legacy) text = legacy;
        } else if (token && pairCode) {
          // QR du jeton (v2) : pas de password, juste le token + pair_code
          const payload = {
            v: 2,
            app: "ecaisse" as const,
            url: getOrchestratorUrl() ?? "",
            token,
            name: profile?.accountName ?? profile?.storeName ?? "",
            account_phone: profile?.accountPhone ?? profile?.phone ?? "",
            pair_code: pairCode,
            ...(profile?.storeName
              ? {
                  shop: {
                    storeName: profile.storeName,
                    ownerName: profile.ownerName ?? "",
                    phone: profile.phone ?? "",
                    quarter: profile.location ?? "",
                    cluster: (getPreferences().cluster as any) ?? "retail",
                    subCategory: (getPreferences().subCategory as any) ?? undefined,
                    customDomain: getPreferences().customDomain ?? "",
                    customUnitType: getPreferences().customUnitType ?? "unit",
                    businessType: getPreferences().businessType ?? "retail",
                    tablesEnabled: getPreferences().tablesEnabled ?? false,
                  },
                }
              : {}),
          };
          text = JSON.stringify(payload);
        }
        if (!text) throw new Error("no-payload");
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
  }, [open, hasAccount, pairCode, shareRole]);

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

  async function togglePairCode() {
    if (pairCode) {
      await clearPairingCode();
      setPairCode(null);
      setCodeExpiry(null);
      return;
    }
    const code = await generatePairingCode();
    setPairCode(code);
    setCodeExpiry(await pairCodeExpiry());
    await announceDevice().catch(() => {});
    toast.success("Code de paire affiché — valable 10 minutes.");
  }

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
            L'employé scanne ce code, entre son nom, et reçoit le stock, les ventes et la caisse du propriétaire via le relais.
          </DialogDescription>
        </DialogHeader>

        {hasAccount ? (
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
              <div className="space-y-1.5">
                <Label htmlFor="share-role">Rôle du nouvel appareil</Label>
                <Select value={shareRole} onValueChange={(v) => setShareRole(v as DeviceRole)}>
                  <SelectTrigger id="share-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employé</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Le rôle est inscrit dans le QR : l'appareil qui le scanne sera automatiquement
                  configuré avec les droits correspondants.
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
                <p className="text-sm text-muted-foreground py-16">
                  Impossible de générer le code QR.
                </p>
              ) : (
                <div className="flex aspect-square h-56 w-full max-w-[224px] items-center justify-center rounded-lg border border-dashed">
                  <QrCode className="h-8 w-8 animate-pulse text-muted-foreground" />
                </div>
              )}
<p className="text-xs text-muted-foreground text-center">
              Ce code donne l'accès à la boutique{" "}
              <span className="font-medium text-foreground">{profile?.storeName}</span> (
              {profile?.accountPhone}). L'employé le scanne, entre son nom, et reçoit le stock, les ventes
              et la caisse via le relais. Ne le montrez qu'à vos propres appareils.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            L'employé scanne le QR ou, s'il ne peut pas, entre le code de paire ci-dessous. Aucun mot de
            passe n'est demandé — le jeton de partage le remplace.
          </p>
          </div>
        ) : profile?.accountKeyword ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Cet écran a rejoint le compte{" "}
            <span className="font-medium text-foreground">par mot clé de récupération</span> : il
            n'a pas le téléphone ni le mot de passe du compte, que le QR transporte. Pour ajouter
            une autre caisse, communiquez-le lui le mot clé reçu à la création (Paramètres →
            Appareils → « Téléphone perdu, ou plus de mot de passe ? »).
          </p>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Aucun compte marchand sur cet appareil : créez-en un ou rejoignez-le depuis l'assistant
            de premier lancement avant d'ajouter un écran.
          </p>
        )}

{hasAnyAccount && (
            <div className="space-y-3 rounded-xl border p-4">
              {isOwner && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Le code de paire est valable 10 minutes. L'employé scanne le QR, entre son nom,
                    et il est ajouté à la boutique.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void togglePairCode()}
                    className="w-full"
                  >
                    {pairCode ? "Masquer le code de paire" : "Afficher le code de paire"}
                  </Button>
                  {pairCode && (
                    <div className="mt-2 rounded-lg border border-dashed bg-accent/40 py-3 text-center">
                      <p className="font-mono text-3xl font-bold tracking-[0.3em]">{pairCode}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        À saisir si l'employé ne peut pas scanner. Valable {minutesLeft} min.
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
