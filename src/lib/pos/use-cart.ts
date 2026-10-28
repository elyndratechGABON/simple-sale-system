// Le panier : son état et les gestes qui le modifient.
//
// L'état est ici ; les RÈGLES sont dans `cart-ops.ts`, pures et testées. Ce hook ne fait
// que brancher les deux et ajouter ce qui est propre à l'affichage : le message de
// stock insuffisant, la vibration du tap.
//
// `resetCart` ne remet PAS que le panier : il remet aussi le client, le moyen de
// paiement, le nombre de convives et la monnaie rendue. Tout ce qui décrit « qui on
// encaisse et comment » est sans sens pour la vente suivante.

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@/lib/db";
import { getCachedIdentity } from "../syncengine/identity";
import { syncMyReservations } from "../syncengine/reservations";
import { cartKey, type CartEntry, type FreeLine, type UiLine } from "./types";
import {
  addOneToLine,
  addToCart,
  removeLine,
  removeOneFromLine,
  toLines,
  variantOf,
} from "./cart-ops";

export function useCart(products: Product[]) {
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [freeLines, setFreeLines] = useState<FreeLine[]>([]);

  // Lignes affichées et envoyées à la base. La projection est recalculée depuis le
  // panier et le catalogue à chaque changement : prix et nom viennent du catalogue,
  // quantité et variante du panier.
  const lines: UiLine[] = useMemo(
    () => toLines(cart, products, freeLines as unknown as UiLine[]),
    [cart, products, freeLines],
  );

  const addEntry = useCallback((p: Product, variantId: string | undefined, qty = 1) => {
    setCart((c) => {
      const r = addToCart(c, p, variantId, qty);
      if (r.refused) {
        // Le refus est ici et pas dans la règle pure : `addToCart` ne doit pas savoir
        // qu'un `toast` existe, sinon elle ne serait plus testable sans navigateur.
        toast.warning(`Stock insuffisant pour ${p.name}`);
        return c;
      }
      return r.cart;
    });
  }, []);

  const addOne = useCallback(
    (p: Product) => {
      navigator.vibrate?.(8);
      // Un produit au kilo ajoute « 1 kg » au tap : la balance ne se devine pas, et
      // l'appui long (seule voie de saisie décimale) reste le geste de correction.
      // Le garde de stock compare des nombres réels — 2,5 <= 5 passe, 6 > 5 est refusé.
      addEntry(p, undefined, 1);
    },
    [addEntry],
  );

  const addOneByKey = useCallback(
    (line: UiLine) => {
      if (!line.product_id) {
        setFreeLines((f) =>
          f.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + 1 } : l)),
        );
        return;
      }
      setCart((c) => {
        const r = addOneToLine(
          c,
          products.find((x) => x.id === line.product_id),
          line.key,
        );
        if (r.refused) {
          toast.warning(`Stock insuffisant pour ${line.name}`);
          return c;
        }
        return r.cart;
      });
    },
    [products],
  );

  const removeOne = useCallback((line: UiLine) => {
    if (!line.product_id) {
      setFreeLines((f) =>
        f
          .map((l) => (l.key === line.key ? { ...l, quantity: l.quantity - 1 } : l))
          .filter((l) => l.quantity > 0),
      );
      return;
    }
    setCart((c) => removeOneFromLine(c, line.key));
  }, []);

  const removeLineByKey = useCallback((line: UiLine) => {
    if (!line.product_id) {
      setFreeLines((f) => f.filter((l) => l.key !== line.key));
      return;
    }
    setCart((c) => removeLine(c, line.key));
  }, []);

  /** Ajout par la dictée : quantités fractionnaires admises (« un kilo et demi »). */
  const addQty = useCallback((p: Product, qty: number) => addEntry(p, undefined, qty), [addEntry]);

  const addFreeLine = useCallback((line: FreeLine) => {
    setFreeLines((f) => [...f, line]);
  }, []);

  /**
   * FIXE la quantité d'une ligne existante — la saisie manuelle par appui long.
   *
   * Distincte de `addOneByKey` : elle remplace au lieu d'incrémenter. Elle fige
   * AU PASSÉ le prix et le coût de la fiche à la quantité demandée, parce que le
   * vendeur vient de corriger sur son écran — si le catalogue a changé entre-temps, la
   * vente doit partir de ce qu'il a vu.
   */
  const setLineQty = useCallback((p: Product, qty: number) => {
    setCart((prev) => ({
      ...prev,
      [cartKey(p)]: { ...prev[cartKey(p)], qty, price: p.price, cost: p.cost },
    }));
  }, []);

  /** Vide le panier. À appeler après une vente encaissée ou une tournée passée. */
  const emptyCart = useCallback(() => {
    setCart({});
    setFreeLines([]);
  }, []);

  // RÉSERVATION OPTIMISTE : l'état du panier devient la source des op
  // `stock.reserve` / `stock.release` — l'ÉCART est émis après chaque changement
  // (comparaison avec le registre local), jamais l'état complet. La vente
  // encaissée vide le panier, donc les réservations repartent d'elles-mêmes au
  // moment de l'écrit ; `sale.created` porte le vrai décrément.
  useEffect(() => {
    const desired = new Map<string, number>();
    for (const [key, entry] of Object.entries(cart)) {
      // La clé du panier PORTE le produit : `${p.id}::${variantId}` (ou `p.id`).
      const sep = key.indexOf("::");
      const productId = sep === -1 ? key : key.slice(0, sep);
      const variantId = sep === -1 ? undefined : key.slice(sep + 2);
      const product = products.find((x) => x.id === productId);
      if (!product || product.type === "service" || !Number.isFinite(product.stock)) continue;
      const regKey = `${product.id}|${variantId ?? ""}`;
      desired.set(regKey, (desired.get(regKey) ?? 0) + entry.qty);
    }
    void syncMyReservations(desired, getCachedIdentity());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, products]);

  return {
    cart,
    freeLines,
    lines,
    addEntry,
    addOne,
    addOneByKey,
    removeOne,
    removeLineByKey,
    addQty,
    addFreeLine,
    setLineQty,
    emptyCart,
    variantOf,
  };
}
