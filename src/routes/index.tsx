// Page publique du produit — la seule qu'un visiteur non installé rencontre.
//
// Elle vit sur `/` alors que l'application installée démarre sur `/pos` : le manifest
// pointe `start_url` vers la caisse (cf. AGENTS.md). Un commerçant qui lance son icône ne
// doit jamais retomber sur la page marketing.
//
// Continuité de marque : cette page est l'ANTICHAMBRE de l'application, pas une pub
// générique. Même émeraude (--primary), même or réservé aux accents premium, mêmes
// arrondis, mêmes icônes ; la maquette du hero est reconstruite en code avec les classes
// de l'app (src/components/landing/mockups.tsx) pour que « ce que je vois ici »
// soit exactement « ce que j'installe ». Palette : vert profond = confiance, or = comptes
// Premium uniquement.
//
// Volontairement COURTE : promesse (hero), ce que fait l'app (quatre puces), prix,
// inscription. Rien d'autre.
//
// Contrainte de fond inchangée : aucun asset distant. Pas de police web, pas d'image CDN.
// Tout doit rester servable hors ligne (page présente dans PRECACHE_PAGES de public/sw.js).
import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELYNDRA CAISSE — Gérez votre business. Vendez plus simplement." },
      {
        name: "description",
        content:
          "Caisse, stocks, clients et rapports : ELYNDRA CAISSE réunit toute votre boutique dans une seule application, utilisable même sans internet.",
      },
    ],
  }),
  component: LandingPage,
});
