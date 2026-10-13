// API publique des briques de Comptabilité. `reports.tsx` n'importe QUE d'ici : il
// reste le shell d'assemblage, chaque unité vit dans son fichier.

export { MonthGrid } from "./MonthGrid";
export { WeekStrip, YearGrid } from "./grids";
export { SelectedDayCard } from "./SelectedDayCard";
export { DayDetailContent } from "./DayDetailContent";
export { Kpi, DayStat, RankRow } from "./primitives";
export { DayDetailDialog, RangeDialog } from "./dialogs";
export { SectorPanel } from "./SectorPanel";
