// API publique des briques du POS. `pos.tsx` n'importe QUE d'ici : il reste le shell
// d'assemblage, chaque unité vit dans son fichier.

export { PosLine } from "./PosLine";
export { CartShell } from "./CartShell";
export { TableCard } from "./TableCard";
export { FreeLineDialog } from "./FreeLineDialog";
export { TargetChip, FilterChip } from "./chips";
export { CategoryRail, CategoryCard } from "./categories";
