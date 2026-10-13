import type { ClusterId } from "@/lib/settings";

export function getTutorialConfig(cluster: ClusterId) {
  const base = {
    defaultCategory: "",
    productLabel: "Nom du produit",
    productPlaceholder: "Ex : Regab",
    categoryPlaceholder: "Ex : Boissons",
    showCategory: true,
    isService: false,
  };

  switch (cluster) {
    case "restaurant":
      return {
        ...base,
        welcomeMessage: "Maintenant, configurons votre espace de vente. Commençons par votre menu.",
        ctaLabel: "Créer mon menu",
        addTitle: "Ajoutez un plat ou une boisson",
        addDescription: "Nom, prix et catégorie. Vous pourrez en ajouter d'autres ensuite.",
        productLabel: "Nom du plat ou de la boisson",
        productPlaceholder: "Ex : Poulet braisé",
        categoryPlaceholder: "Ex : Plats, Boissons, Desserts",
        finalCtaLabel: "Enregistrer ma première commande",
      };
    case "bar":
      return {
        ...base,
        welcomeMessage: "Ajoutez vos boissons pour commencer à encaisser.",
        ctaLabel: "Ajouter mes boissons",
        addTitle: "Ajoutez une boisson",
        addDescription: "Nom, prix et catégorie (Bières, Vins, Spiritueux...).",
        productLabel: "Nom de la boisson",
        productPlaceholder: "Ex : Regab 33cl",
        categoryPlaceholder: "Ex : Bières, Vins, Spiritueux",
        finalCtaLabel: "Commencer à vendre",
      };
    case "service":
      return {
        ...base,
        welcomeMessage:
          "Ajoutez vos coiffures et soins, puis les produits de beauté que vous vendez.",
        ctaLabel: "Ajouter mes prestations",
        addTitle: "Ajoutez une prestation",
        addDescription: "Nom et prix de la prestation — sans stock.",
        productLabel: "Nom de la prestation",
        productPlaceholder: "Ex : Coupe homme",
        showCategory: false,
        isService: true,
        finalCtaLabel: "Enregistrer ma première prestation",
      };
    default:
      return {
        ...base,
        welcomeMessage: "Ajoutez les produits que vous avez actuellement en boutique.",
        ctaLabel: "Ajouter mes produits",
        addTitle: "Ajoutez un produit",
        addDescription: "Nom, prix de vente et stock initial.",
        productLabel: "Nom du produit",
        productPlaceholder: "Ex : Regab, Sucre, Huile",
        categoryPlaceholder: "Ex : Alimentation, Boissons",
        finalCtaLabel: "Faire ma première vente",
      };
  }
}
