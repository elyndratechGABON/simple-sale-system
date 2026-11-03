// Dépôt d'une demande d'abonnement auprès de l'orchestrateur.
//
// Le marchand a payé par mobile money : la caisse dépose ici le palier choisi et la
// référence de la transaction. Aucun identifiant de compte requis — le serveur résout
// le compte via l'écran (device_id), donc une caisse rattachée par migration peut
// demander tout autant. L'administrateur valide EN UN CLIC depuis son tableau de bord ;
// la validation prolonge le compte exactement comme une « Prolongation » manuelle.
import { getShopProfile } from "@/lib/db";
import { getOrchestratorUrl } from "@/lib/sync";
import { fetchWithTimeout, isTimeoutError, timeoutMessage } from "@/lib/fetch-with-timeout";

export interface SubscriptionRequestInput {
  planName: string;
  planPrice: number;
  planDevices: number;
  reference: string;
  note?: string;
}

/** Résultat plutôt qu'exception : l'appelant affiche l'erreur sans casser le flux. */
export async function submitSubscriptionRequest(
  input: SubscriptionRequestInput,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await getShopProfile();
  const url = getOrchestratorUrl();
  if (!profile) return { ok: false, error: "Aucune boutique enregistrée sur cet appareil." };
  if (!url) return { ok: false, error: "Aucun serveur de synchronisation configuré." };
  try {
    const res = await fetchWithTimeout(`${url}/api/v1/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // x-device-id : le serveur résout le compte via device_id — l'en-tête
        // redondant évite tout refus de garde intermédiaire (proxy, WAF).
        "x-device-id": profile.deviceId,
      },
      body: JSON.stringify({
        device_id: profile.deviceId,
        store_name: profile.storeName,
        owner_name: profile.ownerName ?? "",
        plan_name: input.planName,
        plan_price: input.planPrice,
        plan_devices: input.planDevices,
        reference: input.reference.trim(),
        note: (input.note ?? "").slice(0, 500),
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      // 429 = plafond de débit de l'orchestrateur (rate-limiter) : le message serveur
      // est déjà clair, on le laisse passer tel quel.
      return { ok: false, error: data?.error ?? "Le serveur a refusé la demande." };
    }
    return { ok: true };
  } catch (e) {
    if (isTimeoutError(e))
      return {
        ok: false,
        error: timeoutMessage(),
      };
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Impossible de contacter le serveur.",
    };
  }
}
