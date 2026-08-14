// Affiche les messages reçus via la boîte aux lettres (`broadcast_message`) et les
// consomme : chaque message ne sort qu'une fois, même si l'application n'était pas
// ouverte à la réception.
import { useEffect } from "react";
import { toast } from "sonner";
import { consumeMessages } from "@/lib/gatekeeper";

export function GatekeeperAlerts() {
  useEffect(() => {
    void consumeMessages().then((messages) => {
      for (const message of messages) toast(message.text);
    });
  }, []);

  return null;
}
