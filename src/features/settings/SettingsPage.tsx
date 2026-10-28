import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { useAccess } from "@/hooks/use-access";
import { usePreferences } from "@/hooks/use-preferences";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessCard } from "./BusinessCard";
import { ClusterCard } from "./ClusterCard";
import { EmployeeIdentityCard } from "./EmployeeIdentityCard";
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

  return (
    <div className="mx-auto max-w-4xl w-full px-[var(--page-gutter)] py-4">
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
        <Tabs defaultValue="identite">
          <TabsList className="w-full max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="identite" className="shrink-0 whitespace-nowrap min-h-11">
              Identité
            </TabsTrigger>
            <TabsTrigger value="caisse" className="shrink-0 whitespace-nowrap min-h-11">
              Caisse
            </TabsTrigger>
            <TabsTrigger value="equipe" className="shrink-0 whitespace-nowrap min-h-11">
              Équipe
            </TabsTrigger>
            <TabsTrigger value="systeme" className="shrink-0 whitespace-nowrap min-h-11">
              Système
            </TabsTrigger>
            <TabsTrigger value="compte" className="shrink-0 whitespace-nowrap min-h-11">
              Compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identite" className="mt-3 space-y-4">
            <EmployeeIdentityCard />
            <ClusterCard />
            <AppearanceCard />
          </TabsContent>

          <TabsContent value="caisse" className="mt-3 space-y-4">
            <BusinessCard />
            <TablesCard disabled={!tablesFeature} />
          </TabsContent>

          <TabsContent value="equipe" className="mt-3 space-y-4">
            <DevicesCard />
          </TabsContent>

          <TabsContent value="systeme" className="mt-3 space-y-4">
            <PinCard />
            <BackupCard />
            <InstallCard />
          </TabsContent>

          <TabsContent value="compte" className="mt-3 space-y-4">
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
