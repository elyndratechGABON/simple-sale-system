// « Mon établissement » : l'inscription de la boutique auprès de l'orchestrateur (le PC
// du commerçant). Quatre infos saisies une fois, pré-enregistrées localement, poussées à
// chaque synchronisation. La licence (30 jours d'essai, puis prolongations) est affichée
// ici, dans l'attente d'un écran dédié.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Building2, MapPin, Phone, RefreshCw, UserRound, Wifi } from "lucide-react";
import { getShopProfile, saveShopProfile, type ShopProfile } from "@/lib/db";
import { syncNow } from "@/lib/sync";
import { formatDateShort } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

function daysLeft(expiryDate: number): number {
  return Math.max(0, Math.ceil((expiryDate - Date.now()) / DAY_MS));
}

export function ShopCard() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
  });

  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  // Le profil arrive après montage (IndexedDB n'est pas lisible au rendu serveur) :
  // resynchroniser les champs à chaque chargement, comme la carte « Espace de travail ».
  useEffect(() => {
    setOwnerName(profile?.ownerName ?? "");
    setStoreName(profile?.storeName ?? "");
    setPhone(profile?.phone ?? "");
    setLocation(profile?.location ?? "");
  }, [profile]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const owner = ownerName.trim();
      const store = storeName.trim();
      if (!owner || !store) throw new Error("Le propriétaire et la boutique sont requis.");
      await saveShopProfile({
        ownerName: owner,
        storeName: store,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop_profile"] });
      toast.success(profile ? "Boutique mise à jour" : "Boutique enregistrée · essai de 30 jours");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const syncMut = useMutation({
    mutationFn: syncNow,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["shop_profile"] });
      if (!r.ok && r.reason === "no-profile") {
        toast.error("Enregistrez d'abord votre boutique");
      } else if (!r.ok && r.reason === "network") {
        toast.error("Serveur injoignable — réessai automatique au prochain contact");
      } else if (r.ok && r.status === "suspended") {
        toast.error(
          "Compte suspendu — la caisse est bloquée tant que l'abonnement n'est pas renouvelé",
        );
      } else if (r.ok && r.status === "expired") {
        toast.error("Abonnement expiré — prolongez pour débloquer la caisse");
      } else if (r.ok) {
        toast.success("Synchronisée avec l'orchestrateur");
      } else {
        toast.error("Serveur injoignable — réessai automatique au prochain contact");
      }
    },
    onError: () => toast.error("Serveur injoignable"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Mon établissement
        </CardTitle>
        <CardDescription>
          L'inscription envoyée à l'orchestrateur de ce domaine : vos données sont enregistrées sur
          cet appareil et remontent dès que le service est joignable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="shop-owner">Propriétaire</Label>
            <Input
              id="shop-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex : Jean Dupont"
            />
          </div>
          <div>
            <Label htmlFor="shop-store">Nom de la boutique</Label>
            <Input
              id="shop-store"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex : Snack de la Plage"
            />
          </div>
          <div>
            <Label htmlFor="shop-phone">Téléphone</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : 77 123 45 67"
              inputMode="tel"
            />
          </div>
          <div>
            <Label htmlFor="shop-location">Lieu</Label>
            <Input
              id="shop-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex : Derrière l'église, Dakar"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            <UserRound className="h-4 w-4 mr-2" />
            {profile ? "Mettre à jour" : "M'inscrire"}
          </Button>
          {profile && <ProfileStatus profile={profile} />}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <Button variant="secondary" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={cn("h-4 w-4 mr-2", syncMut.isPending && "animate-spin")} />
            Synchroniser
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            L'inscription est envoyée à l'orchestrateur de ce domaine, en arrière-plan, dès qu'il
            est joignable. En dehors, la caisse fonctionne normalement : les données attendent le
            prochain contact.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileStatus({ profile }: { profile: ShopProfile }) {
  const left = daysLeft(profile.expiryDate);
  const expired = left <= 0;
  return (
    <span className="text-sm text-muted-foreground">
      <Badge variant={expired ? "destructive" : "default"} className="mr-2">
        {expired ? "Expiré" : `Licence · ${left} j`}
      </Badge>
      Inscrit le {formatDateShort(profile.registrationDate)} · jusqu'au{" "}
      {formatDateShort(profile.expiryDate)}
      {profile.lastSyncedAt && (
        <span className="block text-xs">
          Dernière synchronisation :{" "}
          {new Date(profile.lastSyncedAt).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
    </span>
  );
}
