import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addProduct, updateProduct, type Category, type Product } from "@/lib/db";
import { runOpsExchange } from "@/lib/sync";
import { fileToScaledDataUrl } from "@/lib/images";
import { usePreferences } from "@/hooks/use-preferences";

// Brouillon de variante dans le formulaire : prix/stock gardés en texte pour la saisie,
// convertis en `price?`/`stock?` (productVariant) à l'enregistrement.
export type VariantDraft = {
  id: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
};

function draftId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useProductForm({
  editing,
  onClose,
  defaultCategory,
  defaultType,
  onSaved,
}: {
  editing: Product | null;
  onClose: () => void;
  defaultCategory?: Category;
  defaultType?: "product" | "service";
  /** Exécuté après UNE sauvegarde réussie, sans fermer : l'onboarding enchaîne les
   *  produits dans le même écran tandis que la modale Stocks se ferme (`onClose`). */
  onSaved?: () => void;
}) {
  const qc = useQueryClient();
  const prefs = usePreferences();
  const cluster = prefs.cluster;
  const hasWeightInput = cluster === "personnalise" && prefs.customUnitType === "weight";
  const hasSerialNumber = false;
  const allowServiceBooking = cluster === "service";
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
  // Prix d'ACHAT, pas celui de revente. `0` = inconnu — c'est la valeur par défaut de
  // `Product.cost` et ce que les rapports lisent comme « bénéfice = CA ». Facultatif : le
  // commerce le saisit quand il le sait, et le.Batch de Comptabilité rattrape le reste.
  const [cost, setCost] = useState<string>(editing && editing.cost > 0 ? String(editing.cost) : "");
  const [unlimited, setUnlimited] = useState(editing ? !Number.isFinite(editing.stock) : false);
  const [stock, setStock] = useState<string>(
    editing && Number.isFinite(editing.stock) ? String(editing.stock) : "",
  );
  const [minStock, setMinStock] = useState<string>(
    editing?.min_stock !== undefined ? String(editing.min_stock) : "",
  );
  const [category, setCategory] = useState<Category>(
    editing?.category ?? defaultCategory ?? "Boisson",
  );
  const [unit, setUnit] = useState<NonNullable<Product["unit"]>>(
    editing?.unit ?? (hasWeightInput ? "kg" : "piece"),
  );
  const [productType, setProductType] = useState<"product" | "service">(
    editing?.type ?? defaultType ?? "product",
  );
  const [serialNumber, setSerialNumber] = useState(editing?.serialNumber ?? "");
  // Photo libre du produit ou service : dataURL webp réduit, purement local.
  const [photo, setPhoto] = useState<string | undefined>(editing?.photo);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Variantes (vêtements) : liste éditable, câblée à `productVariant`.
  const [variants, setVariants] = useState<VariantDraft[]>(
    () =>
      editing?.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price !== undefined ? String(v.price) : "",
        cost: v.cost !== undefined ? String(v.cost) : "",
        stock: v.stock !== undefined ? String(v.stock) : "",
      })) ?? [],
  );

  // Réamorçage du brouillon à CHAQUE changement de cible. Le composant vit sous le Radix
  // Dialog (Root rend ses enfants même le dialogue est fermé), initialisé une fois avec
  // `editing: null` : les useState ci-dessus ne rejouent JAMAIS. Sans cet effet, Modifier
  // un produit ouvrait les champs VIDES — d'où l'obligation de tout réécrire — puis la
  // fermeture/le produit suivant conservaient les valeurs périmées de la cible de
  // l'ouverture précédente. La cible change UNE fois par ouverture (l'hôte la pose dans
  // son état), donc jamais de réamorçage pendant la frappe.
  useEffect(() => {
    setName(editing?.name ?? "");
    setPrice(editing ? String(editing.price) : "");
    setCost(editing && editing.cost > 0 ? String(editing.cost) : "");
    setUnlimited(editing ? !Number.isFinite(editing.stock) : false);
    setStock(editing && Number.isFinite(editing.stock) ? String(editing.stock) : "");
    setMinStock(editing?.min_stock !== undefined ? String(editing.min_stock) : "");
    setCategory(editing?.category ?? defaultCategory ?? "Boisson");
    setUnit(editing?.unit ?? (hasWeightInput ? "kg" : "piece"));
    setProductType(editing?.type ?? defaultType ?? "product");
    setSerialNumber(editing?.serialNumber ?? "");
    setPhoto(editing?.photo);
    setVariants(
      editing?.variants?.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price !== undefined ? String(v.price) : "",
        cost: v.cost !== undefined ? String(v.cost) : "",
        stock: v.stock !== undefined ? String(v.stock) : "",
      })) ?? [],
    );
  }, [editing, defaultCategory, defaultType, hasWeightInput]);

  // Affiche le bloc variantes pour tout produit (pas seulement ceux qui en ont déjà).
  // Le bouton "+ Ajouter une variante" permet d'en créer la première.
  const showVariants = true;

  function addVariant() {
    setVariants((vs) => [...vs, { id: draftId(), name: "", price: "", cost: "", stock: "" }]);
  }
  function updateVariant(id: string, patch: Partial<VariantDraft>) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }
  function removeVariant(id: string) {
    setVariants((vs) => vs.filter((v) => v.id !== id));
  }

  async function handlePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const { dataUrl } = await fileToScaledDataUrl(file);
      setPhoto(dataUrl);
    } catch {
      toast.error("Impossible d'utiliser cette image.");
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const variantsOut =
        variants.length > 0
          ? variants.map((v) => ({
              id: v.id,
              name: v.name,
              ...(v.price ? { price: Number(v.price) } : {}),
              ...(v.cost ? { cost: Number(v.cost) } : {}),
              ...(v.stock ? { stock: Number(v.stock) } : {}),
            }))
          : undefined;
      const p = {
        name: name.trim(),
        cost: Number(cost) || 0,
        price:
          variantsOut && variantsOut.length > 0 ? (variantsOut[0].price ?? 0) : Number(price) || 0,
        stock:
          variantsOut && variantsOut.length > 0
            ? variantsOut.reduce((t, v) => t + (v.stock ?? 0), 0)
            : unlimited
              ? Number.POSITIVE_INFINITY
              : Number(stock) || 0,
        min_stock:
          !unlimited && !(variantsOut && variantsOut.length > 0) && minStock
            ? Number(minStock)
            : undefined,
        category,
        type: productType,
        serialNumber: serialNumber.trim() || undefined,
        unit,
        photo,
        ...(variantsOut ? { variants: variantsOut } : {}),
      };
      if (!p.name) throw new Error("Nom requis");
      if (p.price <= 0) throw new Error("Prix invalide");
      if (editing) {
        await updateProduct({ ...editing, ...p });
      } else {
        await addProduct(p);
      }
      // Pousse immédiatement les opérations vers le relais (best-effort)
      void runOpsExchange().catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
      onClose();
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    name,
    setName,
    price,
    setPrice,
    cost,
    setCost,
    unlimited,
    setUnlimited,
    stock,
    setStock,
    minStock,
    setMinStock,
    category,
    setCategory,
    unit,
    setUnit,
    productType,
    setProductType,
    serialNumber,
    setSerialNumber,
    photo,
    setPhoto,
    photoInputRef,
    photoBusy,
    variants,
    showVariants,
    hasSerialNumber,
    allowServiceBooking,
    addVariant,
    updateVariant,
    removeVariant,
    handlePhoto,
    saveMut,
  };
}

export type ProductFormState = ReturnType<typeof useProductForm>;
