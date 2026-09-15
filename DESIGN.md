# DESIGN.md — ECAISSE (Industrial Neo-Fintech / Precision POS)

## Aesthetic Anchor
- **Style:** Industrial Neo-Fintech / Precision Swiss POS. High contrast, mathematical precision, generous airy whitespace, zero AI generic slop (no Inter sans-serif defaults, no purple-blue gradients on white).
- **Palette:** 
  - Canvas: Pure white (`#FFFFFF`) and slate-50 (`#F8FAFC`).
  - Typography & Borders: Obsidian (`#0F172A`) & Slate (`#334155`), fine micro-borders (`#E2E8F0`).
  - Accent: Precision Emerald (`#059669`, `#10B981`) for positive states, success chimes, and active indicators.

## Typography & Numbers
- **Tabular Numerals:** All financial figures (`formatFCFA`, currency totals, stock counts) must use `tabular-nums` for rock-solid vertical alignment.
- **Hierarchy:** Clear semantic distinction with distinct heading weights (`font-black`, `font-bold`, `font-semibold`).

## Page Rhythm Contract (harmonie inter-écrans)
- **Container:** Toutes les pages applicatives utilisent `app-container` (`--page-gutter` + `--app-max-w`) ; les pages colonne étroite (Historique, Paramètres) conservent `max-w-4xl`/`max-w-3xl` mais reprennent `px-[var(--page-gutter)]`.
- **Rythme vertical unifié :** `space-y-4 py-4` sur toutes les pages (`app-container space-y-4 py-4`). Une seule exception tolérée : une page dense peut alourdir une section interne, jamais le conteneur racine.
- **En-tête de page :** titre `text-page-title font-bold` avec icône Lucide (`h-6 w-6 shrink-0`) + sous-titre `text-sm text-muted-foreground`.
- **Couleurs :** jamais de `slate-*`/`bg-white` hardcodés hors tokens — utiliser `foreground`, `muted-foreground`, `card`, `muted`, `border`. Les variantes accent (`emerald-200/40`, etc.) exigent leur pendant `dark:`.

## Core Tokens & Layout
- Radius: `rounded-2xl` (16px) for major containers, `rounded-xl` for cards, `rounded-lg` for interactive elements.
- Shadows: Multi-tiered precision shadows (`shadow-sm`, `shadow-md`).
- Spacing: Airy padding (`p-6` to `p-8`) with structured grid systems.
- **Focus visible :** `outline-primary/50` (jamais de vert figé dans le code) — cf. `Card.tsx`.

## Anti-Slop Protocol
- No `h-screen` on mobile viewports (always `min-h-[100dvh]`).
- No generic placeholder names (use realistic merchant & product names).
- No emojis as UI icons (Lucide icons only).
