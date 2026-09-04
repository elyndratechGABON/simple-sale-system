/** Hook : état du panier POS (cart, table, payment) — extrait de src/routes/_app/pos.tsx. */
export function usePosCart() {
  // L'état actuel est bien plus riche (table, rounds, free line, etc.).
  // Ce fichier est le point d'entrée du refactoring : le reste du code de pos.tsx
  // doit migrer ses mutations (createSale, addRound, cancelSale) et ses états
  // (cart, tableState, target) vers ce hook au fur et à mesure.
  return {};
}
