import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { useSearch } from "@tanstack/react-router";
import { useAccess } from "@/hooks/use-access";
import { usePreferences } from "@/hooks/use-preferences";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessCard } from "./BusinessCard";
import { ClusterCard } from "./ClusterCard";
import { EmployeeIdentityCard } from "./EmployeeIdentityCard";
import { OwnerInfoCard } from "./OwnerInfoCard";
import { AppearanceCard } from "./AppearanceCard";
import { TablesCard } from "./TablesCard";
import { DevicesCard } from "./DevicesCard";
import { InstallCard } from "./InstallCard";
import { BackupCard } from "./BackupCard";
import { DeleteShopCard } from "./DeleteShopCard";
import { RecoveryKeywordCard } from "./RecoveryKeywordCard";
import { CancelPinCard } from "./CancelPinCard";
import { ResignCard } from "./ResignCard";
import { SubscriptionCard } from "./SubscriptionCard";

export function SettingsPage() {
  const { features } = usePreferences();
  const tablesFeature = features?.tables ?? false;
  const { role } = useAccess();
  const accountLabel = `Compte ${ROLE_LABELS[role]}`;

  // SÉCURITÉ : l'onglet Système (codes PIN d'annulation et de récupération) est une
  // décision du PROPRIÉTAIRE — un employé ne les voit ni ne les change. Hors liste,
  // il n'existe plus : pas seulement grisé, ni visuellement escamoté, ABSENT.
  // L'onglet Compte reste à l'employé : sa DÉMISSION y vit (ResignCard) — il faut
  // bien qu'il puisse partir.
  const estPatron = role === "owner";
  const ONGLETS = ["identite", "caisse", "equipe", "systeme", "donnees", "compte"] as const;
  type Onglet = (typeof ONGLETS)[number];
  const onglets = ONGLETS.filter((o) => estPatron || o !== "systeme");
  const q = useSearch({ strict: false }) as { tab?: string };
  // ?tab=xxx : le rappel de sauvegarde (BackupReminder) pointe l'onglet Données.
  // Onglet inconnu — ou INTERDIT au rôle (un employé qui reçoit ?tab=systeme) —
  // repli « identite » : un lien brisé n'ouvre jamais un onglet vide ou interdit.
  const initialTab: Onglet = onglets.includes(q.tab as Onglet) ? (q.tab as Onglet) : "identite";

  return (
    <div className="mx-auto w-full max-w-full overflow-x-hidden px-4 py-4 pb-24">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-page-title font-bold">Paramètres</h1>
          <Badge variant="secondary">{accountLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl break-words min-w-0">
          Boutique, caisse, équipe et données - tout ce que l'onboarding a demandé.
        </p>
      </div>

      <div className="relative">
        <Tabs defaultValue={initialTab}>
          <TabsList className="w-full max-w-full justify-start overflow-x-auto rounded-full bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:rounded-full">
            <TabsTrigger
              value="identite"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Identité
            </TabsTrigger>
            <TabsTrigger
              value="caisse"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Caisse
            </TabsTrigger>
            <TabsTrigger
              value="equipe"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Équipe
            </TabsTrigger>
            {/* Système (PIN d'annulation + PIN de récupération + installation) :
                propriétaire SEULEMENT — un employé qui aurait l'URL ?tab=systeme
                retombe sur l'onglet identite (cf. `onglets` ci-dessus). */}
            {estPatron && (
              <TabsTrigger
                value="systeme"
                className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
              >
                Système
              </TabsTrigger>
            )}
            <TabsTrigger
              value="donnees"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Données
            </TabsTrigger>
            <TabsTrigger
              value="compte"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identite" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            {/* ORDRE UNIFIÉ (mission UI Identité) :
                patron : Nom Boutique → Nom Proprio → Photo → Logo (logo = PATRON SEUL).
                employé : Nom Boutique → Nom Proprio → Type boutique → Infos employé. */}
            {estPatron ? (
              <>
                <AppearanceCard />
                <OwnerInfoCard />
                <ClusterCard />
              </>
            ) : (
              <>
                <AppearanceCard showLogo={false} />
                <OwnerInfoCard />
                <ClusterCard />
                <EmployeeIdentityCard />
              </>
            )}
          </TabsContent>

          <TabsContent value="caisse" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            <BusinessCard />
            <TablesCard disabled={!tablesFeature} />
          </TabsContent>

          <TabsContent value="equipe" className="mt-3 space-y-4">
            <DevicesCard />
          </TabsContent>

          {/* Système : jamais monté pour un employé (onglet absent de la liste ET du
              DOM — les PIN d'annulation/récupération ne quittent pas l'écran patron). */}
          {estPatron && (
            <TabsContent value="systeme" className="mt-3 grid items-start gap-4 md:grid-cols-2">
              <RecoveryKeywordCard />
              <CancelPinCard />
              <InstallCard />
            </TabsContent>
          )}

          {/* Onglet Données : la sauvegarde-miroir du téléphone (export/import) et la
              restauration serveur. Le rappel « 7 jours » pointe ICI. */}
          <TabsContent value="donnees" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            <BackupCard />
          </TabsContent>

          <TabsContent value="compte" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            {/* L'abonnement ne concerne QUE le compte marchand : un employé voit la
                résiliation, et rien sur la licence qu'il ne paie pas. */}
            {role === "owner" ? (
              <>
                <SubscriptionCard />
                <DeleteShopCard />
              </>
            ) : (
              <ResignCard />
            )}
          </TabsContent>
        </Tabs>
        {/* Fondu droite : il reste des onglets au-delà du bord — on ne devine pas. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-11 w-8 bg-gradient-to-l from-background to-transparent"
        />
      </div>
    </div>
  );
}
