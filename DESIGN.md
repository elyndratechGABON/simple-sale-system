# DESIGN.md — ELYNDRA CAISSE

Dernière mise à jour : 2026-08-23 — refonte du site marketing (`/`)

## Marque

- Nom : **ELYNDRA CAISSE** (ELYNDRA TECH Gabon). Mascotte : Ely le pangolin.
- Promesse : « Gérez votre business. Vendez plus simplement. »
- Ton : direct, concret, rassurant ; jamais de jargon technique, jamais de slop marketing.

## Palette

| Rôle | Valeur | Usage |
|---|---|---|
| Vert principal | `--primary` (oklch 0.55 0.15 155 ≈ #059669) | CTA, liens actifs, chiffres clés, pastilles |
| Vert accent | `--accent` (fond teinté émeraude) | Fonds d'icônes, lignes de panier |
| Vert profond | `#03231a → #053f28` (dégradé) | Sections sombres (Confiance) |
| Or premium | `#d4af37` (+ textes #8a6d1f / #a8842a / #b8912a sur clair) | **Réservé au Premium** : badge, bordure et prix de l'offre 50 000 F uniquement |
| Surfaces | blanc / `bg-muted/40` en alternance | La majorité des surfaces reste claire |

Interdits : or utilisé hors contexte premium ; vert vif en grandes surfaces ; noir/blanc purs non teintés.

## Typographie

Pile système de l'app (contrainte offline-first : aucun asset distant, la page est précachée).
Corps ≤ 65ch, line-height ≥ 1.5, titres tracking-tight.

## Composants signatures

- Cartes : `rounded-[2rem]` (bento) / `rounded-[1.5rem–1.75rem]` (tuiles), ombre de diffusion teintée émeraude `0_24px_70px_-28px_rgba(4,41,30,.35)` — jamais d'ombre noire.
- Icônes : lucide-react exclusivement (zéro emoji dans l'UI).
- Maquettes d'écrans : reconstruites en code (`src/components/landing/mockups.tsx`) avec les classes réelles de l'app (pastilles stock ambiantes/rouges, barre de total FCFA) — pas de captures.
- Données réalistes gabonaises : Priscille Ondo, Mamie Rose, Junior Mba, montants FCFA irréguliers (12 450 F, 187 450 F).

## Mouvement

- Révélations : fadeUp once, décalage 50–120 ms par item.
- Boucles perpétuelles : une seule par carte, composant mémoïsé isolé, intervalle nettoyé, transform/opacity uniquement, gelées sous `prefers-reduced-motion`.
- Springs : smooth {100/20}, overshoot {300/12} pour badges/toasts. Jamais linear ni bounce.

## Landmines continuité site ↔ app

- Le flux d'installation Safari navigue vers `/pos` AVANT d'afficher les étapes — ne jamais inverser.
- `/` reste précachée, scope `/`, `start_url` `/pos`.
- Les secteurs affichés sur la page = ceux de l'onboarding réel (continuité garantie).
