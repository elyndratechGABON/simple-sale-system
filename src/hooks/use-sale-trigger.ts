import { useQueryClient } from "@tanstack/react-query";
import { playSuccessChime } from "@/lib/success-sound";

const SALE_KEYS = [
  ["sales", "today"],
  ["sales", "range"],
];

export function useSaleTrigger() {
  const qc = useQueryClient();

  const notifyOwner = () => {
    // Invalidation immédiate des données propriétaires
    for (const k of SALE_KEYS) qc.invalidateQueries({ queryKey: k });
    // Notification sonore
    playSuccessChime();
    // Badge visuel (via événement global si écran propriétaire ouvert)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ecaiss:new-sale"));
    }
  };

  return { notifyOwner };
}
