// « Mon établissement » : identité éditable de la boutique (propriétaire, nom,
// téléphone, quartier), licence et choix d'abonnement. L'enregistrement écrit les DEUX
// magasins : le profil (IndexedDB, poussé à l'orchestrateur) ET les préférences
// (localStorage : en-tête, accueil, documents exportés). La synchronisation est
// automatique ; seul le compte marchand reste non modifiable ici.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, MapPin, Phone, Save, UserRound, Users, Wifi, CreditCard } from "lucide-react";
import { getShopProfile, saveShopProfile, type ShopProfile } from "@/lib/db";
import { getPreferences, savePreferences } from "@/lib/settings";
import { formatDateShort } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlanChooser } from "@/components/PlanChooser";
import { PaymentModal } from "@/components/PaymentModal";
import type { PlanInfo } from "@/components/SubscriptionPlanCard";

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
    qc.invalidateQueries({ queryKey: ["shop_profile"] });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Établissement enregistré");
  }

  const [planChooserOpen, setPlanChooserOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanInfo | null>(null);

  if (!profile) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Mon établissement
        </CardTitle>
        <CardDescription>
          Informations de votre boutique, synchronisées avec l'orchestrateur.
        </CardDescription>
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

        {profile.accountPhone && (
          <InfoRow
            icon={Users}
            label="Compte marchand"
            value={`${profile.accountName ?? profile.storeName} · ${profile.accountPhone}`}
          />
        )}

        <Button onClick={() => void save()}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <ProfileStatus profile={profile} />
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setPlanChooserOpen(true)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Changer de plan
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5" />
            Synchronisation automatique avec l'orchestrateur. Hors ligne, la caisse fonctionne
            normalement.
          </p>
        </div>

        <PlanChooser
          open={planChooserOpen}
          onOpenChange={setPlanChooserOpen}
          onSelect={(plan) => {
            setSelectedPlan(plan);
            setPaymentOpen(true);
          }}
        />

        <PaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          storeName={profile.storeName}
          ownerName={profile.ownerName}
          selectedPlan={selectedPlan}
        />
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate text-sm">{value}</p>
      </div>
    </div>
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
