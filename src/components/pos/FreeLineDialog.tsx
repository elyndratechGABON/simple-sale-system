// Article manuel : une ligne saisie à la volée, sans fiche produit. Sert quand le
// commerçant vend quelque chose qui n'est pas au catalogue (un regab, une préparation).
// La quantité accepte les décimaux — une pesée de 2,5 kg est un article manuel comme un autre.

import { useState } from "react";
import { toast } from "sonner";
import type { Category } from "@/lib/db";
import { filterQtyInput, parseQty } from "@/lib/pos-quantity";
import type { FreeLine } from "@/lib/pos/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";

export function FreeLineDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (line: FreeLine) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState<Category>("Boisson");

  function reset() {
    setName("");
    setPrice("");
    setQuantity("1");
    setCategory("Boisson");
  }

  function submit() {
    const label = name.trim();
    if (!label) {
      toast.error("Libellé requis");
      return;
    }
    const priceNum = Number(price);
    // `parseQty` normalise la virgule française : `Number("2,5")` vaut NaN, ce qui
    // ferait retomber la quantité sur le repli et facturerait 1 au lieu de 2,5.
    const qtyNum = parseQty(quantity, 1);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Prix de vente invalide");
      return;
    }
    // Bornes de sécurité : une unité (FCFA) ou une quantité délirante corrompt la caisse.
    // L'arrondi à l'entier (Math.round) partait d'une époque où tout se vendait à
    // l'unité : il transforme une pesée de 2,5 en 3 et fait encaisser 500 FCFA de trop.
    // On borne donc SANS arrondir, et on laisse passer les décimales jusqu'au gramme.
    const cappedPrice = Math.min(priceNum, 999_999_999);
    const cappedQty = Number.isFinite(qtyNum) ? Math.max(0.001, Math.min(qtyNum, 10_000)) : 1;
    onAdd({
      key: `libre_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: label,
      cost: 0,
      price: cappedPrice,
      category,
      quantity: cappedQty,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Article manuel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="free-name">Libellé</Label>
            <Input
              id="free-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Regab"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="free-price">Prix de vente</Label>
              <Input
                id="free-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                placeholder="300"
              />
            </div>
            <div>
              <Label htmlFor="free-qty">Quantité (kg ou pièce)</Label>
              <Input
                id="free-qty"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(filterQtyInput(e.target.value, true))}
                placeholder="0,5"
              />
            </div>
          </div>
          <div>
            <Label>Catégorie</Label>
            <CategorySelect value={category} onChange={setCategory} />
          </div>
          <p className="text-xs text-muted-foreground">
            Saisissez le prix de vente. Le coût d'acquisition se renseigne dans les Rapports.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit}>Ajouter au panier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
