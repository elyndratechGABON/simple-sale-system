import { ACTIVE_CLUSTERS, type Preferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { useAccess } from "@/hooks/use-access";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestoreShopCard } from "@/components/RestoreShopCard";
import { BusinessCard } from "./BusinessCard";
import { AppearanceCard } from "./AppearanceCard";
import { TablesCard } from "./TablesCard";
import { DevicesCard } from "./DevicesCard";
import { InstallCard } from "./InstallCard";
import { BackupCard } from "./BackupCard";
import { PinCard } from "./PinCard";

export function SettingsPage() {
  const { cluster, features } = usePreferences();
  const clusterConfig = ACTIVE_CLUSTERS.find((c) => c.id === cluster);
  const { role } = useAccess();
  const accountLabel = `Compte ${ROLE_LABELS[role]}`;
  const tablesFeature = features?.tables ?? false;

  return (
    <div className="mx-auto max-w-3xl px-[var(--page-gutter)] py-4 space-y-3">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-page-title font-bold">Paramètres</h1>
          <Badge variant="secondary">{accountLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Type de commerce, caisse, données et sécurité — tout ce que l'onboarding a demandé.
        </p>
      </div>

      <Tabs defaultValue="boutique">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
          <TabsTrigger value="caisse">Caisse</TabsTrigger>
          <TabsTrigger value="donnees">Données</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
        </TabsList>

        <TabsContent value="boutique" className="mt-3 space-y-3">
          <BusinessCard />
          <AppearanceCard />
          <TablesCard disabled={!tablesFeature} />
        </TabsContent>

        <TabsContent value="caisse" className="mt-3 space-y-3">
          <DevicesCard />
          <InstallCard />
        </TabsContent>

        <TabsContent value="donnees" className="mt-3 space-y-3">
          <RestoreShopCard />
          <BackupCard />
        </TabsContent>

        <TabsContent value="securite" className="mt-3 space-y-3">
          <PinCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
