import { useState } from "react";
import type { Product } from "@/lib/db";

/** État et handlers de tous les dialogues de la page Stocks. */
export function useStocksDialogs() {
  const [editing, setEditing] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [prestationOpen, setPrestationOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Ajout de stock : le produit de départ est transmis en « graine » au dialogue,
  // qui possède son propre formulaire et le réamorce à chaque ouverture.
  const [stockOpen, setStockOpen] = useState(false);
  const [stockSeed, setStockSeed] = useState<string | null>(null);

  // Retrait de stock (correction) + produit visé par la suppression.
  const [removeTarget, setRemoveTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Journal global. `movementsProductId` le restreint à une fiche quand on y entre
  // depuis le menu d'une card produit ; `null` = tous les mouvements confondus.
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [movementsProductId, setMovementsProductId] = useState<string | null>(null);

  // `null` ouvre le dialogue en mode recherche (bouton « Ajouter » du bandeau).
  function openAddStock(p: Product | null) {
    setStockSeed(p ? p.id : null);
    setStockOpen(true);
  }
  function openJournal() {
    setMovementsProductId(null);
    setMovementsOpen(true);
  }
  function openMovements(p: Product) {
    setMovementsProductId(p.id);
    setMovementsOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setEditOpen(true);
  }
  function openCreate() {
    setEditing(null);
    setEditOpen(true);
  }
  function closeEdit() {
    setEditOpen(false);
    setEditing(null);
  }
  function openPrestation() {
    setEditing(null);
    setPrestationOpen(true);
  }
  function closePrestation() {
    setPrestationOpen(false);
    setEditing(null);
  }

  return {
    editing,
    editOpen,
    setEditOpen,
    prestationOpen,
    setPrestationOpen,
    detailId,
    setDetailId,
    stockOpen,
    setStockOpen,
    stockSeed,
    removeTarget,
    setRemoveTarget,
    deleteTarget,
    setDeleteTarget,
    movementsOpen,
    setMovementsOpen,
    movementsProductId,
    setMovementsProductId,
    openAddStock,
    openJournal,
    openMovements,
    openEdit,
    openCreate,
    closeEdit,
    openPrestation,
    closePrestation,
  };
}

export type StocksDialogsApi = ReturnType<typeof useStocksDialogs>;
