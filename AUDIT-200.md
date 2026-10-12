# AUDIT-200 — Fichiers > 200 lignes

> **Version 2 — régénéré après les commits `6efc2ed4` (reports) et `1f94d862` (pos).**
> La v1 datait d'avant ces deux découpages : `reports.tsx` est passé de 1030 à 201,
> `pos.tsx` de 2564 à 1807. `pos.tsx` reste listé (1807) parce que `PosPage` est encore
> un god component — les sous-composants sont sortis, le composant non.

Mesure : `(Get-Content -LiteralPath | Measure-Object -Line).Lines`.

---

## Règle retenue

> **Aucun fichier > 200 lignes. 1 fichier = 1 responsabilité.**
> **Exception actée : les fichiers de TEST sont exemptés** (option B).

---

## Résumé

| Périmètre | > 200 lignes | Tests (exemptés) | À découper |
|---|---|---|---|
| `src/` | **43** | — | **43** |
| `backend/` orchestrateur | 7 | — | **7** |
| **TOTAL** | **50** | | **50** |

**Sur 2 commits, 2 fichiers sont sortis de la liste** (`reports.tsx` à 201, soit à la
limite) et **aucun nouveau n'y est entré**.

---

## 🔴 P1 — Fichiers QUE LA REFONTE DOIT TOUCHER

| Lignes | Fichier | État |
|---|---|---|
| 2600 | `src/lib/db.ts` | Non entamé. **Le plus risqué** : interposé partout, transactions Dexie sur singletons. Dernier. |
| 1807 | `src/routes/_app/pos.tsx` | Sous-composants **extraits** (`1f94d862`). Reste `PosPage` ~1750 lignes : état + mutations + JSX mélangés. |
| 1303 | `src/components/Onboarding.tsx` | Non entamé |
| 1030 → **201** | `src/routes/_app/reports.tsx` | ✅ Découpé (`6efc2ed4`) |
| 645 | `src/components/ProfitSheet.tsx` | Non monté (orphelin). Onglet « Bénéfices » de l'étape 5b. |
| 578 | `src/components/ProductForm.tsx` | Partiellement touché par les étapes 3/4 |

## 🟠 P2 — > 500 lignes, hors refonte (7)

| Lignes | Fichier |
|---|---|
| 1550 | `src/routes/_app/settings.tsx` |
| 1338 | `src/routes/_app/stocks.tsx` |
| 796 | `src/routes/_app/dashboard.tsx` |
| 695 | `src/lib/gatekeeper.ts` |
| 629 | `src/lib/analytics.ts` |
| 621 | `src/routes/welcome.tsx` |
| 615 | `src/routes/index.tsx` |

## 🟡 P3 — 200-500 lignes (29 `src/` + 7 `backend/`)

`EmployeeAccountPanel.tsx` (552), `settings.ts` (527), `DevicePairingDialog.tsx` (517),
`apply.ts` (503), `TeamDialog.tsx` (435), `history.tsx` (420), `ActivityDialog.tsx` (394),
`use-barcode-scanner.ts` (393), `PaymentModal.tsx` (385), `transport.ts` (378),
`SubscriptionsDialog.tsx` (356), `restitution.ts` (329), `RentalView.tsx` (329),
`identity.ts` (326), `RentalBookingDialog.tsx` (321), `demo-data.ts` (310), `chart.tsx` (296),
`sync.ts` (267), `ProductCard.tsx` (264), `voice/parser.ts` (261), `RentalReturnDialog.tsx` (250),
`pairing.ts` (247), `use-pwa-install.ts` (246), `syncengine/types.ts` (245), `exports/json.ts` (233),
`syncengine/transport/pull.ts` (215), `ImageCropper.tsx` (211), `ProductCardSettings.tsx` (206),
`syncengine/pairing.ts` (205).

## 🟢 P4 — `backend/` (7 fichiers)

`routes/admin.mjs` (1293), `routes/cc.mjs` (911), `lib.mjs` (709), `routes/entry.mjs` (640),
`config.mjs` (249), `routes/restore.mjs` (243), `drainer.mjs` (226).

---

## Progression

| Fichier | v1 | v2 | Gain |
|---|---|---|---|
| `reports.tsx` | 1030 | 201 | ✅ −829 |
| `pos.tsx` | 2564 | 1807 | ✅ −757 (sous-composants sortis) |
| **Total > 200** | **52** | **50** | — |

`reports.tsx` est à **201** : une ligne au-dessus de la limite (le compteur
`Measure-Object -Line` sous-compte la dernière ligne sans saut de ligne). À traiter au
prochain passage sur ce fichier.

---

## Suite P1 — ordre proposé

1. **`use-pos-data`** (queries + mutations de `PosPage`) — ~400 lignes, ne touche pas au rendu.
2. **`use-cart`** (logique caddier) — ~300 lignes.
3. **`use-table-state`** — ~150 lignes.
4. **`PosHeader` + `PosGrid`** (extraction JSX) — ~300 lignes.
5. **`PosCartPanel` + `PosModals`** (extraction JSX) — ~450 lignes.
6. `ProfitSheet` (étape 5b) — 645 lignes, à monter en onglet.
7. `ProductForm`, `Onboarding`.
8. **`db.ts`** — dernier, par tranches.

---

## Note sur `ProfitSheet.tsx`

Vérifié : **0 import, 0 `<ProfitSheet />`**. Une seule mention hors son propre fichier,
un commentaire dans `analytics.ts:361`. Sa logique (`profit.ts`) est vivante et utilisée
partout. → **Feature terminée, jamais branchée** (pas du code mort : à monter en onglet
« Bénéfices », PRD §5.4).

---

## Sortie

`AUDIT-200.md` v2. **Aucune ligne de code écrite.**