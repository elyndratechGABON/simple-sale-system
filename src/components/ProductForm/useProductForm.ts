import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addProduct, updateProduct, type Category, type Product } from "@/lib/db";
import { fileToScaledDataUrl } from "@/lib/images";
import { usePreferences } from "@/hooks/use-preferences";

// Brouillon de variante dans le formulaire : prix/stock gardés en texte pour la saisie,
// convertis en `price?`/`stock?` (productVariant) à l'enregistrement.
export type VariantDraft = {
  id: string;
  name: string;
  price: string;
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
}: {
  editing: Product | null;
  onClose: () => void;
  defaultCategory?: Category;
  defaultType?: "product" | "service";
}) {
  const qc = useQueryClient();
  const prefs = usePreferences();
  const cluster = prefs.cluster;
  const hasVariants = false; // Only clothing cluster had variants, now removed
  const hasWeightInput = cluster === "personnalise" && prefs.customUnitType === "weight";
  const hasSerialNumber = false;
  const allowServiceBooking = cluster === "service";
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState<string>(editing ? String(editing.price) : "");
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
  const [unit, setUnit] = useState<NonNullable<Product["unit"]>>(editing?.unit ?? "piece");
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
        stock: v.stock !== undefined ? String(v.stock) : "",
      })) ?? [],
  );

  // Affiche le bloc variantes quand le produit EST un produit, OU quand il en porte déjà
  // (édition d'une fiche existante). Le deuxième terme est un garde-fou de DONNÉES : des
  // variantes ont pu être créées hors `clothing` (l'onboarding ne les bloquait pas), la
  // caisse les vend toujours (`pos.tsx` variant picker). Masquer le bloc sur ces fiches
  // les rendrait invisibles ET non modifiables. Un commerçant qui n'a jamais eu de
  // variantes ne voit toujours rien.
  const showVariants = productType === "product" && (hasVariants || variants.length > 0);

  function addVariant() {
    setVariants((vs) => [...vs, { id: draftId(), name: "", price: "", stock: "" }]);
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
              ...(v.stock ? { stock: Number(v.stock) } : {}),
            }))
          : undefined;
      const p = {
        name: name.trim(),
        cost: editing?.cost ?? 0,
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit ajouté");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    name,
    setName,
    price,
    setPrice,
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
