import { useState } from "react";
import { CLUSTER_MAP, getPreferences } from "@/lib/settings";
import { addProduct } from "@/lib/db";
import { loadDemoData } from "@/lib/demo-data";
import { toast } from "sonner";
import { getTutorialConfig } from "./tutorialConfig";

export type TutorialStep = "confirm" | "add" | "done";

export function useClusterTutorial(onComplete: () => void) {
  const prefs = getPreferences();
  const cluster = prefs.cluster;
  const config = CLUSTER_MAP[cluster];
  // Personnalisé + stock au kilo : la vente se fait au poids.
  const sellsByWeight = cluster === "personnalise" && prefs.customUnitType === "weight";

  const [subStep, setSubStep] = useState<TutorialStep>("confirm");
  const [addedCount, setAddedCount] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  // Tous clusters : choix Prestation (sans stock) vs Produit (avec stock).
  // Défaut "produit" car la majorité des clusters sont orientés produits.
  const [serviceMode, setServiceMode] = useState<"prestation" | "produit">("produit");
  const isServiceCluster = cluster === "service";
  const addingProduct = serviceMode === "produit";

  // Variantes dynamiques — applicable à tout produit (tailles, couleurs, etc.).
  const [variants, setVariants] = useState<{ name: string; price: string; stock: string }[]>([]);
  const showVariants = config.stock.hasVariants;

  // Formulaire produit
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productCategory, setProductCategory] = useState("");

  const tutorialConfig = getTutorialConfig(cluster);
  const addTitle = addingProduct ? "Ajoutez un produit à vendre" : tutorialConfig.addTitle;

  async function handleLoadDemo() {
    setLoadingDemo(true);
    try {
      const count = await loadDemoData(cluster);
      setAddedCount((c) => c + count);
      toast.success(`${count} produits de démo chargés`);
      setSubStep("done");
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoadingDemo(false);
    }
  }

  async function handleAddProduct() {
    if (!productName.trim() || !productPrice.trim()) return;

    await addProduct({
      name: productName.trim(),
      price: Number(productPrice) || 0,
      cost: 0,
      category:
        productCategory.trim() || (addingProduct ? "Beauté" : tutorialConfig.defaultCategory),
      stock: Number(productStock) || 0,
      type: tutorialConfig.isService && serviceMode === "prestation" ? "service" : "product",
      // V23 : `unitType`/`weightUnit` laissent la place à l'unité unique. Un produit
      // vendu au kilo s'écrit `unit: "kg"`, tout le reste vaut "piece".
      unit: sellsByWeight ? "kg" : "piece",
      serialNumber: undefined,
      variants: variants
        .map((v) => ({
          id: crypto.randomUUID(),
          name: v.name.trim(),
          price: Number(v.price) || 0,
          cost: 0,
          stock: Number(v.stock) || 0,
        }))
        .filter((v) => v.name.trim()),
    });
    setAddedCount((c) => c + 1);
    setProductName("");
    setProductPrice("");
    setProductStock("");
    setProductCategory("");
  }

  return {
    prefs,
    cluster,
    sellsByWeight,
    subStep,
    setSubStep,
    addedCount,
    loadingDemo,
    serviceMode,
    setServiceMode,
    isServiceCluster,
    addingProduct,
    variants,
    setVariants,
    showVariants,
    productName,
    setProductName,
    productPrice,
    setProductPrice,
    productStock,
    setProductStock,
    productCategory,
    setProductCategory,
    tutorialConfig,
    addTitle,
    handleLoadDemo,
    handleAddProduct,
    onComplete,
  };
}

export type ClusterTutorialApi = ReturnType<typeof useClusterTutorial>;
