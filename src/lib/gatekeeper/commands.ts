import { getSetting, getShopProfile, setSetting, setShopExpiry } from "@/lib/db";
import { SETTING_APPLIED, SETTING_DELETE_REQUEST, SETTING_MESSAGES } from "./settings";
import type { AdminCommand, DeleteAccountRequest } from "./types";

// ── Mémoire des ordres appliqués (idempotence) ────────────────────────────────────
// Persistée : si l'app meurt entre « appliquer » et « accuser », le même ordre peut
// revenir au prochain handshake — on le saute, on a déjà ses effets.
export async function getAppliedIds(): Promise<string[]> {
  return (await getSetting<string[]>(SETTING_APPLIED)) ?? [];
}

export async function setAppliedIds(ids: string[]): Promise<void> {
  await setSetting(SETTING_APPLIED, ids);
}

// ── Messages reçus (affichés par _app.tsx via sonner) ─────────────────────────────
export async function consumeMessages(): Promise<{ text: string; at: number }[]> {
  const messages = (await getSetting<{ text: string; at: number }[]>(SETTING_MESSAGES)) ?? [];
  if (messages.length > 0) await setSetting(SETTING_MESSAGES, []);
  return messages;
}

// ── Application d'un ordre ────────────────────────────────────────────────────────
export async function applyCommand(command: AdminCommand): Promise<void> {
  if (command.action_type === "renew" && typeof command.payload.new_end_date === "number") {
    await setShopExpiry(command.payload.new_end_date);
  }
  if (command.action_type === "broadcast_message" && command.payload.message_text) {
    const messages = (await getSetting<{ text: string; at: number }[]>(SETTING_MESSAGES)) ?? [];
    await setSetting(
      SETTING_MESSAGES,
      [...messages, { text: command.payload.message_text, at: Date.now() }].slice(-5),
    );
  }
  // Décision du propriétaire sur une demande de suppression (orchestrateur → caisse).
  // Envoyée sans doute à tout le groupe, elle n'est CONSENTIE que sur la caisse cible :
  // si le `device_id` du payload diffère de celui de CET appareil, la commande est
  // acquittée sans effet (elle ne reviendra pas chaque handshake). Sur la cible, on pose
  // la demande en attente — l'employé la voit depuis l'écran : `approved` la purge,
  // `rejected` n'affiche que le refus.
  if (command.action_type === "delete_account_request") {
    const profile = await getShopProfile();
    const target = command.payload.device_id;
    if (profile && target && target === profile.deviceId) {
      await setSetting(SETTING_DELETE_REQUEST, {
        command_id: command.id,
        device_id: profile.deviceId,
        status: command.payload.status === "rejected" ? "rejected" : "approved",
        message: (command.payload.message ?? command.payload.message_text)?.trim() || undefined,
        requested_at: command.created_at ?? Date.now(),
      } satisfies DeleteAccountRequest);
    }
  }
}
