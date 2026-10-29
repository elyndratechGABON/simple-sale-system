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
import { PinCard } from "./PinCard";
import { DeleteShopCard } from "./DeleteShopCard";
import { ResignCard } from "./ResignCard";
import { SubscriptionCard } from "./SubscriptionCard";

export function SettingsPage() {
  const { features } = usePreferences();
  const tablesFeature = features?.tables ?? false;
  const { role } = useAccess();
  const accountLabel = `Compte ${ROLE_LABELS[role]}`;

  const ONGLETS = ["identite", "caisse", "equipe", "systeme", "donnees", "compte"] as const;
  type Onglet = (typeof ONGLETS)[number];
  const q = useSearch({ strict: false }) as { tab?: string };
  // ?tab=xxx : le rappel de sauvegarde (BackupReminder) pointe l'onglet Données.
  // Onglet inconnu = repli « identite » — un lien brisé n'ouvre jamais un onglet vide.
  const initialTab: Onglet = ONGLETS.includes(q.tab as Onglet) ? (q.tab as Onglet) : "identite";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 overflow-x-hidden py-4">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-page-title font-bold">Paramètres</h1>
          <Badge variant="secondary">{accountLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
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
            <TabsTrigger
              value="systeme"
              className="shrink-0 whitespace-nowrap rounded-full min-h-11 shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              Système
            </TabsTrigger>
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
            {/* Employé : la fiche du patron, en tête — c'est la première question qu'il
                a quand il atterrit sur l'écran (à qui appartient cette caisse ?). */}
            <OwnerInfoCard />
            <EmployeeIdentityCard />
            <ClusterCard />
            <AppearanceCard />
          </TabsContent>

          <TabsContent value="caisse" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            <BusinessCard />
            <TablesCard disabled={!tablesFeature} />
          </TabsContent>

          <TabsContent value="equipe" className="mt-3 space-y-4">
            <DevicesCard />
          </TabsContent>

          <TabsContent value="systeme" className="mt-3 grid items-start gap-4 md:grid-cols-2">
            <PinCard />
            <InstallCard />
          </TabsContent>

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
