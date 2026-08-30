// « Mon établissement » : identité éditable de la boutique (propriétaire, nom,
// téléphone, quartier). L'enregistrement écrit les DEUX magasins : le profil
// (IndexedDB, poussé à l'orchestrateur) ET les préférences (localStorage : en-tête,
// accueil). La synchronisation est automatique.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Save, UserRound } from "lucide-react";
import { getShopProfile, saveShopProfile } from "@/lib/db";
import { getPreferences, savePreferences } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopCard() {
  const { data: profile } = useQuery({
    queryKey: ["shop_profile"],
    queryFn: getShopProfile,
  });

  // Champs d'identité : préremplis depuis le profil, avec repli sur les préférences
  // (installations existantes où « Espace de travail » était la seule source saisie).
  const [ownerName, setOwnerName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!profile) return;
    const prefs = getPreferences();
    setOwnerName(profile.ownerName || prefs.ownerName);
    setStoreName(profile.storeName || prefs.workspaceName);
    setPhone(profile.phone || prefs.phone);
    setLocation(profile.location || prefs.quarter);
  }, [profile]);

  async function save() {
    const trimmedStore = storeName.trim();
    if (!trimmedStore) {
      toast.error("Le nom de la boutique ne peut pas être vide");
      return;
    }
    const trimmedOwner = ownerName.trim();
    const trimmedPhone = phone.trim();
    const trimmedLocation = location.trim();
    await saveShopProfile({
      ownerName: trimmedOwner,
      storeName: trimmedStore,
      phone: trimmedPhone,
      location: trimmedLocation,
    });
    savePreferences({
      workspaceName: trimmedStore,
      ownerName: trimmedOwner,
      phone: trimmedPhone,
      quarter: trimmedLocation,
    });
    toast.success("Établissement enregistré");
  }

  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Mon établissement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shop-owner" className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" /> Propriétaire
            </Label>
            <Input
              id="shop-owner"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Ex : Marie Kabongo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shop-name" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Boutique
            </Label>
            <Input
              id="shop-name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Ex : Alimentation Chez Marie"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shop-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Téléphone
            </Label>
            <Input
              id="shop-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : +241 06 123 456"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shop-location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Quartier
            </Label>
            <Input
              id="shop-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex : Owendo"
            />
          </div>
        </div>

        <Button onClick={() => void save()}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
