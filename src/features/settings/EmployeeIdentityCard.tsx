import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  ensureIdentity,
  setIdentityEmployeeName,
  setIdentityEmployeePhone,
} from "@/lib/syncengine/identity";
import { reannounceProfile } from "@/lib/syncengine/pairing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * « Qui utilise cette caisse » : le nom et le numéro de la personne devant l'écran.
 *
 * Pourquoi cette carte existe : l'orchestrateur Elyndra affiche, pour chaque boutique,
 * la liste de ses EMPLOYÉS (nom + numéro) plutôt que des identifiants techniques. Cette
 * information est celle que la personne saisit au scan du QR (cf. useWelcomeFlow) —
 * mais un écran appairé AVANT cette saisie n'a aucun nom à envoyer.
 *
 * Cette carte permet donc de le déclarer (ou de le corriger) à tout moment : le nom part
 * au handshake suivant, et l'administrateur le voit dans la console.
 */
export function EmployeeIdentityCard() {
  const qc = useQueryClient();
  const { data: identity } = useQuery({
    queryKey: ["sync_identity"],
    queryFn: ensureIdentity,
    staleTime: 60_000,
  });

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    if (!identity) return;
    setNom(identity.employeeName ?? "");
    setTelephone(identity.employeePhone ?? "");
  }, [identity?.employeeName, identity?.employeePhone]);

  const estEmploye = identity?.role === "employee";

  async function enregistrer() {
    const n = nom.trim();
    const t = telephone.trim();
    if (!n) {
      toast.error("Le nom est obligatoire — c'est lui que l'administrateur voit.");
      return;
    }
    await setIdentityEmployeeName(n);
    if (t) await setIdentityEmployeePhone(t);
    // L'identité est mise en cache : on invalide pour que la fiche se rafraîchisse.
    qc.invalidateQueries({ queryKey: ["sync_identity"] });
    // Ré-annonce au patron : il voit le nom corrigé sans attendre le prochain cycle
    // d'échange (cf. reannounceProfile — un one-shot, à enchaîner après le setter).
    try {
      await reannounceProfile();
    } catch {
      // Hors ligne : l'information partira au prochain handshake, rien n'est perdu.
    }
    setEnregistre(true);
    toast.success("Enregistré — l'administrateur le verra à la prochaine synchronisation.");
  }

  return (
    <div className="flat-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <UserRound className="h-5 w-5" /> Qui utilise cette caisse
        </h2>
        <p className="text-small text-muted-foreground">
          {estEmploye
            ? "Votre nom et votre numéro apparaissent chez le patron et dans la console Elyndra, à côté de cet écran."
            : "Cet écran est le vôtre : il est identifié par le nom de la boutique et le nom du patron."}
        </p>
      </header>

      {estEmploye ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="identite-nom">Nom</Label>
            <Input
              id="identite-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Jean-Baptiste"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="identite-tel">Numéro (facultatif)</Label>
            <Input
              id="identite-tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="Ex. 077 12 34 56"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <Button onClick={() => void enregistrer()}>Enregistrer</Button>
          {enregistre && (
            <p className="text-small text-muted-foreground">
              Envoyé à l&apos;orchestrateur. Sans réseau, l&apos;information partira au prochain
              passage en ligne.
            </p>
          )}
        </div>
      ) : (
        <p className="text-body text-muted-foreground">
          Rien à déclarer : le nom du patron et celui de la boutique sont déjà transmis à chaque
          synchronisation.
        </p>
      )}
    </div>
  );
}
