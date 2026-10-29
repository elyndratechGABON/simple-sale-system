import { CARD_PRESETS } from "@/lib/card-display";
import type { Preferences } from "./types";

export const DEFAULT_PREFERENCES: Preferences = {
  workspaceName: "Ma boutique",
  onboarded: false,
  // Restaurant + tables = le comportement historique de l'application (plan de salle
  // toujours affiché) : les comptes déjà enregistrés ne changent pas de mode.
  cluster: "restaurant",
  customDomain: "",
  features: {
    tables: false,
    subscription: "inconnu",
  },
  tablesEnabled: false,
  tables: ["1", "2", "3", "4", "5", "6"],
  phone: "",
  quarter: "",
  ownerName: "",
  ownerPhoto: "",
  onboardingCompleted: false,
  privacyAccepted: false,
  // l'ordre d'affichage sur la card. Le standard est
  // « image, nom, prix, stock » : le minimum pour comparer deux articles d'un coup
  // d'œil sans laisser le prix absent.
  stockCardFields: [...CARD_PRESETS.standard],
  caisseCardFields: [...CARD_PRESETS.compact],
  // Archivage financier : quatre fois par mois est un bon défaut — le commerçant
  // a une trace hebdomadaire sans écrire 365 lignes par an.
  snapshotFrequency: 7,
};
