// Stocks & Produits — centre de pilotage du stock, pas une simple liste.
//
// Résumé chiffré en tête (valeur, volumes, alertes), recherche/filtres/tri, bloc
// d'attention, puis fiche produit compacte avec jauge de stock et actions rapides
// (réapprovisionner, corriger, modifier, supprimer). Le journal des mouvements répond
// au « pourquoi ce stock a baissé ? » — chaque variation est écrite par src/lib/db.ts,
// la page ne fait que le lire.
import { createFileRoute } from "@tanstack/react-router";
import { StocksPage } from "@/features/stocks/StocksPage";

export const Route = createFileRoute("/_app/stocks")({
  head: () => ({
    meta: [
      { title: "Stock & Produits — ELYNDRA CAISSE" },
      {
        name: "description",
        content: "Gérez vos produits, vos quantités et vos réapprovisionnements.",
      },
    ],
  }),
  component: StocksPage,
});
