import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Wifi, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getIdentity, refreshShopId } from "@/lib/syncengine/identity";
import { getDeviceFingerprint } from "@/lib/device-fingerprint";
import { setShopAccount } from "@/lib/db";
import { getLocalOrchestratorUrl } from "@/lib/sync/local-server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Carte "Reconnecter au proprio" : permet a un employe de reconnecter son ecran
 * au compte du proprietaire apres perte de donnees / reinstallation.
 *
 * L'employe entre le telephone + mot de passe du compte proprio.
 * L'ecran se reappaire (handshake) et recupere son stock / ventes / clients.
 */
export function ReconnectCard() {
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const connectMut = useMutation({
    mutationFn: async () => {
      setConnecting(true);
      try {
        const identity = await getIdentity();
        const fingerprint = await getDeviceFingerprint();
        const localUrl = getLocalOrchestratorUrl();

        if (!localUrl) {
          throw new Error(
            "Aucune instance locale configuree. Configurez l'adresse de l'orchestrateur local dans Parametres > Compte > Serveur local.",
          );
        }

        const res = await fetch(`${localUrl}/api/v1/handshake`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: identity?.deviceId,
            account_phone: phone.trim(),
            account_password: password.trim(),
            app_version: "1.0.0",
            app_origin: "pos",
            device_fingerprint: fingerprint,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.sync_allowed) {
          throw new Error(data.reason || "Compte suspendu ou expire");
        }
        await setShopAccount({
          name: data.shop?.storeName || "Boutique",
          phone: phone.trim(),
          password: password.trim(),
        });
        await refreshShopId();
        return true;
      } finally {
        setConnecting(false);
      }
    },
    onSuccess: () => {
      toast.success("Reconnecte au proprio - synchronisation en cours...");
      window.location.reload();
    },
    onError: (e: Error) => {
      toast.error(e.message || "Echec de la reconnexion");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Ne pas soumettre si d�j� en cours de connexion ou champs vides
    if (connecting || !phone.trim() || !password.trim()) return;
    connectMut.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wifi className="h-4 w-4 text-primary" />
          Reconnecter au proprio
        </CardTitle>
        <CardDescription>
          Vous avez perdu vos donnees (reinstallation, reset, perte telephone). Entrez les
          identifiants du compte proprio pour reconnecter cet ecran.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Telephone du proprio
            </label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 XX XX XX XX"
              required
              disabled={connecting}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (connecting || !phone.trim() || !password.trim()) &&
                e.preventDefault()
              }
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              Mot de passe du compte proprio
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="......."
              required
              disabled={connecting}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (connecting || !phone.trim() || !password.trim()) &&
                e.preventDefault()
              }
            />
          </div>
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={connecting || !phone.trim() || !password.trim()}
            >
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Reconnecter au proprio
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Les identifiants sont ceux du compte proprio (telephone + mot de passe). La connexion
              s'effectue en HTTPS direct avec le serveur.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
