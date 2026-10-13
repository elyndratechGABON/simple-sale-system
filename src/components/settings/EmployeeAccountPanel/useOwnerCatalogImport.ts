import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { importOwnerCatalog, type ImportPhase } from "@/lib/sync";

/** Import manuel du catalogue propriétaire (pull des ops du groupe + application). */
export function useOwnerCatalogImport() {
  const qc = useQueryClient();
  const [importPhase, setImportPhase] = useState<ImportPhase | "done" | null>(null);
  const [importResult, setImportResult] = useState<{ applied: number; count: number } | null>(null);

  const importMut = useMutation({
    mutationFn: async () => {
      setImportPhase("relay");
      setImportResult(null);
      const res = await importOwnerCatalog(setImportPhase);
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["products"] });
        setImportResult({ applied: res.applied, count: res.count });
        setImportPhase("done");
      }
      return res;
    },
    onSuccess: (res) => {
      if (!res.ok) {
        setImportPhase(null);
        if (res.cause === "offline") {
          toast.error("Import impossible : hors ligne — reconnectez cet écran au réseau.");
        } else if (res.cause === "orphan") {
          toast.error(
            "Cette caisse n'est rattachée à aucun compte : rescannez le QR du propriétaire pour la relier.",
          );
        } else {
          toast.info(
            "Demande envoyée : le téléphone du propriétaire doit être en ligne. Les produits apparaîtront automatiquement dès sa réponse.",
            { duration: 8000 },
          );
        }
        return;
      }
      if (res.applied > 0) {
        toast.success(`Stock importé : ${res.count} produit(s) en caisse.`);
      } else if (res.count > 0) {
        toast.success(`Catalogue déjà à jour : ${res.count} produit(s) en caisse.`);
      } else {
        toast.info(
          "Aucun produit reçu — le propriétaire doit avoir synchronisé son catalogue au moins une fois.",
        );
      }
    },
    onError: (error) => {
      setImportPhase(null);
      toast.error(error instanceof Error ? error.message : "Import impossible.");
    },
  });

  return { importPhase, importResult, importMut };
}
