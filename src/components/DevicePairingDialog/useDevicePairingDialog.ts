import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getAccountQuota, refreshAccountQuota, blessEmployeeDevice } from "@/lib/gatekeeper";
import { getDB, getShopProfile, listProducts } from "@/lib/db";
import { ensureIdentity } from "@/lib/syncengine/identity";
import { invalidateDeviceQueries, listPairedDevices } from "@/lib/syncengine/peers";
import { approveDevice, getPairingToken, pairCodeExpiry } from "@/lib/syncengine/pairing";
import type { PairedDevice } from "@/lib/syncengine/types";

// État et logique du dialogue d'appairage : requêtes, dérivés, effets et approbation.
// Le composant ne garde que le rendu.
export function useDevicePairingDialog(open: boolean) {
  const qc = useQueryClient();
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);
  // Partage de stock : écran employé dont on est en train de régler le partage.
  const [sharePeer, setSharePeer] = useState<PairedDevice | null>(null);

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
  // Nombre de produits du catalogue : le libellé « Tout le stock (N produits) » doit
  // compter le catalogue RÉEL, pas une valeur devinée.
  const { data: produitsCount } = useQuery({
    queryKey: ["share_stock_count"],
    queryFn: async () => (await listProducts()).length,
    enabled: open,
    staleTime: 15_000,
  });

  const hasNamePhone = Boolean(
    (profile?.accountPhone || profile?.phone) && (profile?.accountName || profile?.storeName),
  );
  // Identifiants complets (téléphone + mot de passe) : seuls ceux qui les détiennent
  // voient la fiche « Compte marchand » avec le mot de passe.
  const hasCredentials = Boolean(profile?.accountPhone && profile.accountPassword);
  const hasKeywordOnly = Boolean(profile?.accountKeyword) && !hasCredentials;
  const hasAnyAccount = hasNamePhone || hasKeywordOnly;
  // Crédit d'écrans LOCAL (offline-first : l'approuvé vit sur le téléphone du propriétaire
  // avant que l'orchestrateur ne le rattache). 1 = cet écran + les écrans `paired` du groupe.
  const localDeviceCount = 1 + (peers ?? []).filter((p) => p.status === "paired").length;
  const atCapacity = quota ? localDeviceCount >= quota.maxDevices : false;
  const isOwner = identity?.role === "owner";
  const pending = (peers ?? []).filter((p) => p.status === "pending");
  const paired = (peers ?? []).filter((p) => p.status !== "pending");
  const pairedCount = paired.length;
  const minutesLeft = codeExpiry ? Math.max(0, Math.ceil((codeExpiry - Date.now()) / 60_000)) : 0;

  // Code de paire : recharger le code actif (et son expiration) à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [code, expiry] = await Promise.all([getPairingToken(), pairCodeExpiry()]);
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
    if (!open) return;
    let annule = false;
    void (async () => {
      // Le compteur du compte vient du SERVEUR : le cached peut dater du dernier
      // handshake, donc d'avant l'employé qui vient de scanner. On le rafraîchit à
      // l'ouverture — c'est le moment où le patron regarde cette carte.
      const frais = await refreshAccountQuota();
      if (annule) return;
      if (frais) await qc.invalidateQueries({ queryKey: ["account_quota"] });
    })();
    return () => {
      annule = true;
    };
  }, [open, qc]);

  async function approve(peerId: string) {
    await approveDevice(peerId, "employee");
    await qc.invalidateQueries({ queryKey: ["paired_devices"] });
    toast.success("Écran approuvé — rôle employé.");
    // Rattachement au compte marchand (best-effort, non bloquant) : le crédit d'écran est
    // déjà local ; ceci n'actualise que le compteur serveur, dès que l'orchestrateur répond.
    const peer = await getDB().paired_devices.get(peerId);
    if (peer?.server_device_id) {
      const res = await blessEmployeeDevice(peer.server_device_id);
      if (res.ok) {
        await getDB().paired_devices.update(peerId, { blessed_at: Date.now() });
      } else {
        toast.info("Enregistrement serveur en attente.", { description: res.message });
      }
    }
    // Le nombre d'écrans affiché ailleurs (carte « Appareils », quota) dépend de trois
    // requêtes distinctes ; l'invalidateur central les rafraîchit toutes. Sans cela le
    // compteur restait figé jusqu'au handshake suivant — indéfiniment hors ligne.
    await invalidateDeviceQueries(qc);
    // Le compteur affiché doit bouger ICI, sans attendre que le patron ferme et rouvre le
    // dialogue : l'approbation vient de consommer une place, c'est le moment de le dire.
    const frais = await refreshAccountQuota();
    if (frais) await qc.invalidateQueries({ queryKey: ["account_quota"] });
    // L'approbation est le moment où le propriétaire décide du STOCK : on ouvre le choix
    // tout de suite, tant qu'il a l'écran en tête.
    const approuve = await getDB().paired_devices.get(peerId);
    if (approuve) setSharePeer(approuve);
  }

  return {
    qc,
    profile,
    quota,
    identity,
    peers,
    produitsCount,
    hasNamePhone,
    hasAnyAccount,
    localDeviceCount,
    atCapacity,
    isOwner,
    pending,
    paired,
    pairedCount,
    minutesLeft,
    pairCode,
    setPairCode,
    setCodeExpiry,
    sharePeer,
    setSharePeer,
    approve,
  };
}

export type DevicePairingState = ReturnType<typeof useDevicePairingDialog>;
