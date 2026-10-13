import { ACTIVE_CLUSTERS } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import { ROLE_LABELS } from "@/lib/syncengine/pairing";
import { useAccess } from "@/hooks/use-access";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCardSettings } from "@/components/ProductCardSettings";
import { RestoreShopCard } from "@/components/RestoreShopCard";
import { EmployeeAccountPanel } from "@/components/settings/EmployeeAccountPanel";
import { BusinessCard } from "./BusinessCard";
import { AppearanceCard } from "./AppearanceCard";
import { ClientsCard } from "./ClientsCard";
import { TablesCard } from "./TablesCard";
import { DevicesCard } from "./DevicesCard";
import { InstallCard } from "./InstallCard";
import { DirectoryCard } from "./DirectoryCard";
import { BackupCard } from "./BackupCard";
import { DeleteShopCard } from "./DeleteShopCard";
import { PinCard } from "./PinCard";
import { SubscriptionCard } from "./SubscriptionCard";
import { AboutCard } from "./AboutCard";

export function SettingsPage() {
  const { cluster } = usePreferences();
  const clusterConfig = ACTIVE_CLUSTERS.find((c) => c.id === cluster);
  const { role } = useAccess();
  const accountLabel = `Compte ${ROLE_LABELS[role]}`;

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

      {/* Les 12 cartes de ce fichier sont réparties par grandeur. Chacune était écrite
          mais jamais montée : ce panneau est ce qui les rend accessibles. Un onglet par
          domaine, comme les réglages d'une application — pas une page unique de 3 cartes. */}
      <Tabs defaultValue="boutique">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="boutique">Boutique</TabsTrigger>
          <TabsTrigger value="affichage">Affichage</TabsTrigger>
          <TabsTrigger value="caisse">Caisse</TabsTrigger>
          <TabsTrigger value="donnees">Données</TabsTrigger>
          <TabsTrigger value="securite">Sécurité</TabsTrigger>
          <TabsTrigger value="abonnement">Abonnement</TabsTrigger>
          <TabsTrigger value="apropos">À propos</TabsTrigger>
        </TabsList>

        <TabsContent value="boutique" className="mt-3 space-y-3">
          <BusinessCard />
          <AppearanceCard />
          <ClientsCard />
          {clusterConfig?.workflow.hasTables && <TablesCard />}
        </TabsContent>

        {/* Affichage des cards produit : réglage séparé du thème (§22). */}
        <TabsContent value="affichage" className="mt-3 space-y-3">
          <ProductCardSettings context="stocks" />
          <ProductCardSettings context="caisse" />
        </TabsContent>

        <TabsContent value="caisse" className="mt-3 space-y-3">
          <DevicesCard />
          <InstallCard />
        </TabsContent>

        <TabsContent value="donnees" className="mt-3 space-y-3">
          {/* Récupération AVANT la sauvegarde manuelle : c'est le chemin qui rend le
              téléphone perdu, l'export ne le fait pas. En tête, pas en fin. */}
          <RestoreShopCard />
          <DirectoryCard />
          <BackupCard />
          <DeleteShopCard />
        </TabsContent>

        <TabsContent value="securite" className="mt-3 space-y-3">
          <PinCard />
          <EmployeeAccountPanel />
        </TabsContent>

        <TabsContent value="abonnement" className="mt-3 space-y-3">
          <SubscriptionCard />
        </TabsContent>

        <TabsContent value="apropos" className="mt-3 space-y-3">
          <AboutCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
