// Préférences utilisateur : nom de l'espace de travail, couleur principale, drapeau
// d'onboarding. Elles vivent dans localStorage et NON dans IndexedDB.
//
// Pourquoi cette séparation : IndexedDB est la base métier (ventes, produits, dépenses),
// elle sera un jour synchronisée entre appareils. Une préférence d'affichage n'a rien à
// y faire — elle est propre à l'appareil, doit se lire de façon SYNCHRONE au premier
// rendu (localStorage l'est, IndexedDB ne l'est pas) et sa perte est sans gravité.
//
// L'exception assumée est le dossier de documents : un `FileSystemDirectoryHandle` n'est
// pas sérialisable en JSON, il ne peut PAS tenir dans localStorage. Il reste donc dans
// IndexedDB via src/lib/files.ts. Ne pas tenter de « ranger » les deux au même endroit.

const KEY = "pos_preferences";

export interface Preferences {
  /** Nom de l'entreprise. Affiché dans l'en-tête et en tête des documents exportés. */
  workspaceName: string;
  /** Teinte oklch de la couleur principale, 0–360. Voir `applyTheme`. */
  hue: number;
  /** Passe à true une fois l'assistant de premier lancement terminé ou passé. */
  onboarded: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  workspaceName: "Ma boutique",
  // 155 = le vert d'origine codé en dur dans src/styles.css. Garder cette valeur par
  // défaut fait que l'application non configurée est pixel pour pixel celle d'avant.
  hue: 155,
  onboarded: false,
};

/**
 * Couleurs proposées à l'onboarding et dans les paramètres.
 *
 * Ce sont des TEINTES, pas des couleurs complètes : voir `applyTheme` pour la raison.
 */
export const PRESET_HUES: { label: string; hue: number }[] = [
  { label: "Vert", hue: 155 },
  { label: "Émeraude", hue: 175 },
  { label: "Bleu", hue: 240 },
  { label: "Indigo", hue: 275 },
  { label: "Violet", hue: 310 },
  { label: "Rose", hue: 350 },
  { label: "Rouge", hue: 25 },
  { label: "Orange", hue: 60 },
  { label: "Ocre", hue: 95 },
];

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    // Fusion avec les défauts, jamais remplacement : une version future qui ajoute une
    // préférence doit pouvoir lire un enregistrement écrit par la version d'avant.
    return {
      workspaceName: parsed.workspaceName?.trim() || DEFAULT_PREFERENCES.workspaceName,
      hue: normalizeHue(parsed.hue),
      onboarded: parsed.onboarded === true,
    };
  } catch {
    // JSON corrompu ou localStorage inaccessible (mode privé strict) : les défauts
    // valent mieux qu'une application qui refuse de démarrer.
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...getPreferences(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Quota plein ou stockage refusé : la préférence ne survivra pas au rechargement,
      // mais l'application reste utilisable pour cette session.
    }
  }
  return next;
}

function normalizeHue(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.hue;
  return ((n % 360) + 360) % 360;
}

/**
 * Applique la couleur principale en réécrivant les tokens de src/styles.css sur
 * `document.documentElement`.
 *
 * On ne stocke qu'une TEINTE, pas une couleur complète, et c'est délibéré : toute la
 * palette claire de styles.css est construite sur la teinte 155 avec des couples
 * clarté/chroma accordés entre eux (primaire soutenu, accent pâle, texte sur accent
 * foncé). Faire tourner la seule teinte préserve ces rapports — donc les contrastes —
 * alors que laisser choisir un `#rrggbb` arbitraire pour `--primary` casserait la
 * lisibilité du texte posé dessus dès que l'utilisateur prend un jaune vif.
 *
 * Les écarts de teinte des graphiques (+15, +45, −55, −95) reproduisent ceux déjà
 * codés en dur dans styles.css. Ne pas les « arrondir » : ils sont ce qui rend les
 * cinq séries distinguables.
 */
export function applyTheme(hue: number): void {
  if (typeof document === "undefined") return;
  const h = normalizeHue(hue);
  const rot = (delta: number) => (((h + delta) % 360) + 360) % 360;

  const tokens: Record<string, string> = {
    "--primary": `oklch(0.55 0.15 ${h})`,
    "--primary-foreground": `oklch(0.99 0.005 ${h})`,
    "--secondary": `oklch(0.95 0.02 ${h})`,
    "--secondary-foreground": `oklch(0.25 0.05 ${h})`,
    "--accent": `oklch(0.93 0.05 ${h})`,
    "--accent-foreground": `oklch(0.25 0.08 ${h})`,
    "--ring": `oklch(0.55 0.15 ${h})`,
    // Chroma volontairement minuscule : le fond et les bordures ne font que porter une
    // trace de la teinte. Les rendre francs saturerait toute la surface de l'écran.
    "--background": `oklch(0.985 0.005 ${rot(-35)})`,
    "--muted": `oklch(0.96 0.008 ${rot(-5)})`,
    "--border": `oklch(0.9 0.015 ${rot(-5)})`,
    "--input": `oklch(0.9 0.015 ${rot(-5)})`,
    "--chart-1": `oklch(0.55 0.15 ${h})`,
    "--chart-2": `oklch(0.7 0.14 ${rot(15)})`,
    "--chart-3": `oklch(0.62 0.13 ${rot(45)})`,
    "--chart-4": `oklch(0.75 0.15 ${rot(-55)})`,
    "--chart-5": `oklch(0.68 0.14 ${rot(-95)})`,
  };

  for (const [name, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(name, value);
  }

  // La barre d'état d'Android et la fenêtre installée lisent `theme-color`, pas les
  // variables CSS : sans cette ligne l'application installée garderait le vert d'origine
  // autour d'une interface devenue violette.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", `oklch(0.55 0.15 ${h})`);
}

/** Couleur d'aperçu d'une pastille de choix, sans toucher au document. */
export const swatchColor = (hue: number) => `oklch(0.55 0.15 ${hue})`;
