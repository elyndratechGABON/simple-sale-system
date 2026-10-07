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
import { Boxes, Check, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/lib/db";
import { resolveSharedProducts, saveShareDecision, shareDecisionOf } from "@/lib/syncengine/sharing";
import type { PairedDevice, ShareMode } from "@/lib/syncengine/types";

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
    return (produits ?? []).filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [produits, recherche]);

  if (!peer) return null;
  const nom = peer.device_name?.trim() || "cet écran";
  const total = produits?.length ?? 0;

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
      const partages = mode === "all" ? total : choisis.length;
      onShared?.(partages);
      onOpenChange(false);
    } catch {
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
            Choisissez ce que cet écran reçoit du catalogue de la boutique. Ce choix lui est
            propre : un autre employé peut recevoir autre chose.
          </DialogDescription>
        </DialogHeader>

        {/* Choix du mode — deux boutons, pas un menu : c'est LA décision. */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={[
              "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              mode === "all"
                ? "border-primary bg-primary/10 font-medium"
                : "hover:bg-accent",
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
              mode === "selection"
                ? "border-primary bg-primary/10 font-medium"
                : "hover:bg-accent",
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Filtrer par nom ou catégorie"
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setChoisis(filtres.map((p) => p.id))
                }
              >
                Tout cocher
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setChoisis([])}>
                Tout décocher
              </Button>
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
              {filtres.map((p) => {
                const actif = choisis.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => basculer(p.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span
                      className={[
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        actif ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      ].join(" ")}
                    >
                      {actif && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {p.category}
                    </Badge>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {Number.isFinite(p.stock) ? p.stock : "∞"}
                    </span>
                  </button>
                );
              })}
              {filtres.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Aucun produit à ce filtre.
                </p>
              )}
            </div>
          </div>
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
