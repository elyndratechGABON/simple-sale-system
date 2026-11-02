// Dialogue « Partager le stock » : le propriétaire choisit, pour UN écran employé, ce que
// cet écran recevra — tout le catalogue, ou une sélection de produits.
//
// La décision est enregistrée sur la fiche du pair (`paired_devices`) et republished par
// le transport au cycle suivant : le dialogue n'envoie rien lui-même, il décide. Un
// instantané déjà parti n'est jamais « retiré » — retirer un article chez un employé
// ferait disparaître de son catalogue un produit qui lui appartient peut-être ; c'est dit
// ici plutôt que laissé à découvrir.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/db";
import { runOpsExchange } from "@/lib/sync";
import {
  publishShareNow,
  resolveSharedProducts,
  saveShareDecision,
  shareDecisionOf,
} from "@/lib/syncengine/sharing";
import type { PairedDevice, ShareMode } from "@/lib/syncengine/types";
import { StockSelectionList } from "./StockSelectionList";

interface ShareStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** L'écran employé dont on règle le partage. */
  peer: PairedDevice | null;
  /** Enregistre et renvoie le nombre de produits retenus (pour le message de sortie). */
  onShared?: (count: number) => void;
}

export function ShareStockDialog({ open, onOpenChange, peer, onShared }: ShareStockDialogProps) {
  const [mode, setMode] = useState<ShareMode>("all");
  const [choisis, setChoisis] = useState<string[]>([]);
  const [recherche, setRecherche] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState("");

  const { data: produits } = useQuery({
    queryKey: ["share_stock_products"],
    queryFn: listProducts,
    enabled: open,
    staleTime: 15_000,
  });

  // Ouverture : on repart de la décision EN COURS pour cet écran, jamais d'un défaut.
  useEffect(() => {
    if (!open || !peer) return;
    const current = shareDecisionOf(peer);
    setMode(current.mode);
    void resolveSharedProducts(peer).then((p) => setChoisis(p.map((x) => x.id)));
    setRecherche("");
    setErreur("");
  }, [open, peer]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    // Les produits PRIVÉS du patron ne sont PAS partageables : ni proposés, ni comptés
    // dans le « tout le stock » — ils ne quittent jamais son écran (déjà exclu du
    // moteur via resolveSharedProducts ; ici on les masque aussi du choix).
    return (produits ?? [])
      .filter((p) => !p.is_private)
      .filter(
        (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
      );
  }, [produits, recherche]);

  if (!peer) return null;
  const nom = peer.device_name?.trim() || "cet écran";
  const total = (produits ?? []).filter((p) => !p.is_private).length;

  function basculer(id: string) {
    setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function partager() {
    if (!peer) return;
    setBusy(true);
    setErreur("");
    try {
      const res = await saveShareDecision(peer.id, mode, mode === "all" ? [] : choisis);
      if (!res.ok) {
        setErreur("Écran introuvable — partage annulé.");
        return;
      }
      // Publication IMMÉDIATE de l'instantané (les produits cochés), puis poussée
      // OBSERVÉE au relais : on attend le résultat au lieu d'un `void` muet — c'est
      // ce silence qui faisait croire à un bouton mort (les gardes de l'échange —
      // maintenance, relais non configuré — renvoyaient null sans un mot).
      const partis = await publishShareNow(peer.id);
      if (partis === 0) {
        // Rien n'est parti : la sélection résolue est vide (catalogue privé/vide).
        setErreur("Aucun produit à transférer — la sélection est vide.");
        return;
      }
      let pousse = false;
      try {
        const state = await runOpsExchange();
        pousse = (state?.pushed ?? 0) > 0;
      } catch (e) {
        // Diagnostic visible : l'échange a échoué (réseau, relais) — on le logue
        // pour qu'un « le bouton ne fait rien » ait toujours une trace en console.
        console.error("[ShareStockDialog] poussée du snapshot échouée :", e);
      }
      if (!pousse) {
        // L'op est DANS l'outbox : elle partira au prochain cycle de sync (60 s),
        // mais l'utilisateur mérite de le savoir plutôt qu'un succès mensonger.
        toast.warning("Transfert enregistré — envoi au prochain cycle de synchronisation.");
      }
      const partages = mode === "all" ? total : choisis.length;
      onShared?.(partages);
      onOpenChange(false);
    } catch (e) {
      console.error("[ShareStockDialog] partage échoué :", e);
      setErreur("Le partage n'a pas pu être enregistré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" /> Stock partagé avec {nom}
          </DialogTitle>
          <DialogDescription>
            Choisissez ce que cet écran reçoit du catalogue de la boutique. Ce choix lui est propre
            : un autre employé peut recevoir autre chose.
          </DialogDescription>
        </DialogHeader>

        {/* Choix du mode — deux boutons, pas un menu : c'est LA décision. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={[
              "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              mode === "all" ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5">
              {mode === "all" && <Check className="h-3.5 w-3.5" />}
              Tout le stock
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {total} produit{total > 1 ? "s" : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("selection")}
            className={[
              "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              mode === "selection" ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent",
            ].join(" ")}
          >
            <span className="flex items-center gap-1.5">
              {mode === "selection" && <Check className="h-3.5 w-3.5" />}
              Sélection
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {choisis.length} retenu{choisis.length > 1 ? "s" : ""}
            </span>
          </button>
        </div>

        {mode === "selection" && (
          <StockSelectionList
            products={filtres}
            selectedIds={choisis}
            search={recherche}
            onSearch={setRecherche}
            onToggle={basculer}
            onSelectAll={() => setChoisis(filtres.map((p) => p.id))}
            onClear={() => setChoisis([])}
          />
        )}

        {erreur && <p className="text-xs text-destructive">{erreur}</p>}

        <p className="text-xs text-muted-foreground">
          Le partage ajoute et met à jour le stock de cet écran. Retirer un produit ici ne le
          supprime pas de la caisse de l&quot;employé : pour ça, il faut le supprimer de son écran.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={busy || (mode === "selection" && choisis.length === 0)}
            onClick={() => void partager()}
          >
            {busy ? "Enregistrement…" : "Partager"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
