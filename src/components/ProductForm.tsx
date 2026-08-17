// Formulaire de création / édition d'un produit. Partagé entre l'écran Stocks et la
// caisse (catalogue vide → créer le premier produit sans changer d'écran).
//
// Le composant gère lui-même sa mutation et son invalidation : ses deux hôtes n'ont
// qu'à le monter dans un `Dialog` et lui donner un `onClose`.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addProduct, updateProduct, type Category, type Product } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/CategorySelect";
import { toast } from "sonner";
import { useClusterFeatures } from "@/hooks/use-cluster-features";

export function ProductForm({
  editing,
  onClose,
  defaultCategory,
  defaultType,
}: {
  editing: Product | null;
  onClose: () => void;
  defaultCategory?: Category;
  defaultType?: "product" | "service";
}) {
  const qc = useQueryClient();
  const { hasSerialNumber, unitType, hasExpiryDate, allowDeposit } = useClusterFeatures();
  const [name, setName] = useState(editing?.name ?? "");
  const [barcode, setBarcode] = useState(editing?.barcode ?? "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
  const [unlimited, setUnlimited] = useState(editing ? !Number.isFinite(editing.stock) : false);
  const [stock, setStock] = useState<string>(
    editing && Number.isFinite(editing.stock) ? String(editing.stock) : "",
  );
  const [category, setCategory] = useState<Category>(
    editing?.category ?? defaultCategory ?? "Boisson",
  );
  const [productType, setProductType] = useState<"product" | "service">(
    editing?.type ?? defaultType ?? "product",
  );
  const [hasConsignment, setHasConsignment] = useState(editing?.hasConsignment ?? false);
  const [serialNumber, setSerialNumber] = useState(editing?.serialNumber ?? "");
  const [unit, setUnit] = useState<"piece" | "meter" | "liter">(editing?.unit ?? "piece");
  const [expiryDate, setExpiryDate] = useState(
    editing?.expiryDate ? new Date(editing.expiryDate).toISOString().split("T")[0] : "",
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const p = {
        name: name.trim(),
        cost: 0,
        price: Number(price) || 0,
        stock: unlimited ? Number.POSITIVE_INFINITY : Number(stock) || 0,
        category,
        barcode: barcode.trim() || null,
        type: productType,
        hasConsignment: allowDeposit ? hasConsignment : false,
        serialNumber: serialNumber.trim() || undefined,
        unit: unitType === "mixed" || unitType === "weight" ? unit : undefined,
        expiryDate: expiryDate ? new Date(expiryDate).getTime() : undefined,
      };
      if (!p.name) throw new Error("Nom requis");
      if (p.price <= 0) throw new Error("Prix invalide");
      if (editing) {
        await updateProduct({ ...editing, ...p });
      } else {
        await addProduct(p);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Regab"
          />
        </div>
        <div>
          <Label htmlFor="barcode">Code-barres</Label>
          <Input
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Optionnel"
          />
        </div>
        {productType === "service" ? (
          <div>
            <Label htmlFor="price">Prix de vente</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="300"
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Prix de vente</Label>
                <Input
                  id="price"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="300"
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={stock}
                  onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))}
                  placeholder="50"
                  disabled={unlimited}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(v) => setUnlimited(Boolean(v))}
              />
              <Label htmlFor="unlimited" className="cursor-pointer">
                Stock illimité
              </Label>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={productType === "product" ? "default" : "outline"}
                size="sm"
                onClick={() => setProductType("product")}
                className="flex-1"
              >
                Produit
              </Button>
              <Button
                type="button"
                variant={productType === "service" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setProductType("service");
                  setUnlimited(true);
                }}
                className="flex-1"
              >
                Prestation
              </Button>
            </div>
          </div>
          {allowDeposit && (
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="consignment"
                  checked={hasConsignment}
                  onCheckedChange={(v) => setHasConsignment(Boolean(v))}
                />
                <Label htmlFor="consignment" className="cursor-pointer">
                  Consigne
                </Label>
              </div>
            </div>
          )}
        </div>
        {hasSerialNumber && productType === "product" && (
          <div>
            <Label htmlFor="serialNumber">Numéro de série / IMEI</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Optionnel — ex: IMEI ou N° série"
            />
          </div>
        )}
        {(unitType === "mixed" || unitType === "weight") && productType === "product" && (
          <div>
            <Label>Unité de vente</Label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={unit === "piece" ? "default" : "outline"}
                size="sm"
                onClick={() => setUnit("piece")}
              >
                Pièce
              </Button>
              <Button
                type="button"
                variant={unit === "meter" ? "default" : "outline"}
                size="sm"
                onClick={() => setUnit("meter")}
              >
                Mètre
              </Button>
              <Button
                type="button"
                variant={unit === "liter" ? "default" : "outline"}
                size="sm"
                onClick={() => setUnit("liter")}
              >
                Litre
              </Button>
            </div>
          </div>
        )}
        {hasExpiryDate && productType === "product" && (
          <div>
            <Label htmlFor="expiryDate">Date de péremption</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        )}
        <div>
          <Label>Catégorie</Label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          Enregistrer
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
