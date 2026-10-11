import { useEffect, useState } from "react";
import {
  listPendingCatalogueRequests,
  confirmCatalogueRequest,
  denyCatalogueRequest,
} from "@/lib/db";

export interface PendingCatalogueRequest {
  id: string;
  shop_id: string;
  requester_id: string;
  status: "pending" | "confirmed" | "denied" | "expired";
  created_at: number;
  confirmed_at?: number;
  denied_at?: number;
  snapshot_sent: boolean;
}

/**
 * Hook pour le propriétaire : écoute les demandes d'import de catalogue
 * et gère la confirmation/refus.
 */
export function usePendingCatalogueRequests(shopId: string | null) {
  const [requests, setRequests] = useState<PendingCatalogueRequest[]>([]);

  useEffect(() => {
    if (!shopId) return;

    const loadRequests = async () => {
      const reqs = await listPendingCatalogueRequests(shopId);
      setRequests(reqs);
    };

    loadRequests();

    // Écoute l'événement custom émis par transport.ts
    const handleEvent = (e: CustomEvent) => {
      loadRequests();
    };

    window.addEventListener("catalogue-request-pending", handleEvent as EventListener);

    // Polling de secours (au cas où l'événement serait manqué)
    const interval = setInterval(loadRequests, 5000);

    return () => {
      window.removeEventListener("catalogue-request-pending", handleEvent as EventListener);
      clearInterval(interval);
    };
  }, [shopId]);

  const confirm = async (id: string) => {
    await confirmCatalogueRequest(id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "confirmed" as const, confirmed_at: Date.now() } : r,
      ),
    );
  };

  const deny = async (id: string) => {
    await denyCatalogueRequest(id);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "denied" as const, denied_at: Date.now() } : r,
      ),
    );
  };

  return { requests, confirm, deny };
}
