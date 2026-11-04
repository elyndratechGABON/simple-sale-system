import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

/** La sonde rend le MÊME grid que les vraies lignes (cf. rowClass) mais hors écran :
 *  getComputedStyle y lit le nombre de colonnes réellement résolu par Tailwind
 *  (grid-cols / @container), sans duplication des breakpoints en JS. */
function ColumnProbe({
  rowClass,
  onColumns,
}: {
  rowClass: string;
  onColumns: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const probe = ref.current;
    if (!probe) return;
    const update = () => {
      const n = getComputedStyle(probe).gridTemplateColumns.split(" ").filter(Boolean).length;
      if (n > 0) onColumns(n);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(probe);
    return () => ro.disconnect();
  }, [rowClass, onColumns]);
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(rowClass, "absolute -z-10 h-0 overflow-hidden opacity-0")}
    >
      <div />
    </div>
  );
}
/** Grille VIRTUALISÉE en flux de PAGE (scroll fenêtre) : seule la rangée (chunk de
 *  `cols` items) autour du viewport est rendue, les absentes sont remplacées par
 *  l'espace total mesuré. Règle #23 de l'audit de performance : la grille POS/Stocks
 *  reste fluide même avec des centaines d'articles — le DOM ne grandit plus avec le
 *  catalogue.
 *
 * Chaque ligne est un VRAI `grid` (les classes reçues : grid-cols, gap-x,
 * @container) ; l'écart VERTICAL vient d'un padding-bas de ligne (le virtualisateur
 * mesure la ligne entière, gap compris), jamais d'un `gap-y` du conteneur. */
export function VirtualizedGrid<T>({
  items,
  itemKey,
  rowClass,
  gapYClass = "pb-2",
  renderItem,
}: {
  items: T[];
  itemKey: (item: T, index: number) => string;
  /** Classes de LA LIGNE (ex. "grid grid-cols-2 gap-x-2.5 xs:gap-x-3") : reproduit
   *  les colonnes responsive de la grille d'origine, sonde et vraies lignes
   *  résolvent donc le même nombre de colonnes. */
  rowClass: string;
  gapYClass?: string;
  renderItem: (item: T) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(2);
  // scrollMargin : distance entre le HAUT du document et le haut de la grille —
  // l'offset que le virtualisateur fenêtre doit amortir pour ne compter que le
  // scroll de LA grille. Recalculé au montage et à chaque resize de la fenêtre
  // (un changement de breakpoint déplace forcément l'origine).
  const [scrollMargin, setScrollMargin] = useState(0);
  useEffect(() => {
    const update = () => setScrollMargin(containerRef.current?.offsetTop ?? 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const rows = Array.from({ length: Math.ceil(items.length / cols) }, (_, r) =>
    items.slice(r * cols, (r + 1) * cols).map((item) => ({ item, key: itemKey(item, r * cols) })),
  );
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 220,
    overscan: 4,
    scrollMargin,
  });
  return (
    <div>
      <ColumnProbe rowClass={rowClass} onColumns={(n) => setCols((c) => (c === n ? c : n))} />
      <div ref={containerRef} style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((row) => {
          const line = rows[row.index];
          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className={cn(rowClass, "absolute left-0 top-0 w-full", gapYClass)}
              style={{ transform: `translateY(${row.start - scrollMargin}px)` }}
            >
              {line.map((cell) => (
                // `h-full` : la cellule épouse la hauteur de LA RANGÉE — les cartes
                // d'une même ligne ont toutes la même taille (règle des tailles
                // homogènes). Sans lui, chaque carte prend sa hauteur propre.
                <div key={cell.key} className="h-full min-w-0">
                  {renderItem(cell.item)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
