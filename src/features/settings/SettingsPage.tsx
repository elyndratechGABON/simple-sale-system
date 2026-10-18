import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { useAccess } from "@/hooks/use-access";
import { usePreferences } from "@/hooks/use-preferences";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessCard } from "./BusinessCard";
import { ClusterCard } from "./ClusterCard";
import { AppearanceCard } from "./AppearanceCard";
import { TablesCard } from "./TablesCard";
import { DevicesCard } from "./DevicesCard";
import { InstallCard } from "./InstallCard";
import { BackupCard } from "./BackupCard";
import { PinCard } from "./PinCard";

export function SettingsPage() {
  const { features } = usePreferences();
  const tablesFeature = features?.tables ?? false;
  const { role } = useAccess();
  const accountLabel = `Compte ${ROLE_LABELS[role]}`;

  return (
    <div className="mx-auto max-w-3xl px-[var(--page-gutter)] py-4">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-page-title font-bold">Paramètres</h1>
          <Badge variant="secondary">{accountLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Boutique, caisse, équipe et données — tout ce que l'onboarding a demandé.
        </p>
      </div>

      <Tabs defaultValue="identite">
        <TabsList className="w-full max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="identite" className="shrink-0 whitespace-nowrap">
            Identité
          </TabsTrigger>
          <TabsTrigger value="caisse" className="shrink-0 whitespace-nowrap">
            Caisse
          </TabsTrigger>
          <TabsTrigger value="equipe" className="shrink-0 whitespace-nowrap">
            Équipe
          </TabsTrigger>
          <TabsTrigger value="systeme" className="shrink-0 whitespace-nowrap">
            Système
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identite" className="mt-3 space-y-3">
          <ClusterCard />
          <AppearanceCard />
        </TabsContent>

        <TabsContent value="caisse" className="mt-3 space-y-3">
          <BusinessCard />
          <TablesCard disabled={!tablesFeature} />
        </TabsContent>

        <TabsContent value="equipe" className="mt-3 space-y-3">
          <DevicesCard />
        </TabsContent>

        <TabsContent value="systeme" className="mt-3 space-y-3">
          <PinCard />
          <BackupCard />
          <InstallCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
