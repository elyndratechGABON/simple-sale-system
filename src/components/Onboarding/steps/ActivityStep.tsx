import { Store } from "lucide-react";
import { CLUSTER_MAP, WORKFLOW_DESCRIPTIONS, type ClusterId } from "@/lib/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { StepShell } from "../StepShell";
import { resolveIcon } from "../icons";
import type { SetupWizardApi } from "../useSetupWizard";

export function ActivityStep({ w }: { w: SetupWizardApi }) {
  return (
    <StepShell
      icon={Store}
      title="Quel type d'activité gérez-vous ?"
      description="Choisissez votre secteur. L'application s'adaptera automatiquement."
    >
      {/* Les 4 clusters actifs en grille 2×2 parfaitement symétrique. */}
      <div className="grid grid-cols-2 gap-2">
        {["restaurant", "bar", "service", "personnalise"].map((id) => {
          const c = CLUSTER_MAP[id as ClusterId];
          const Icon = resolveIcon(c.icon);
          const active = w.selectedCluster === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => w.setSelectedCluster(c.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-sm transition-colors",
                active
                  ? "border-primary bg-accent ring-1 ring-primary"
                  : "bg-card hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "rounded-lg p-1.5",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="font-medium text-xs leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>
      {w.selectedCluster && w.clusterConfig && (
        /* Carte de confirmation PERSONNALISÉE : le libellé, la description et les
           étapes du workflow sont ceux du cluster choisi — l'utilisateur voit dès ici
           ce que l'application fera pour lui. */
        <div className="mt-2 space-y-2 rounded-xl border bg-accent/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{w.clusterConfig.label}</p>
          <p>{w.clusterConfig.description}</p>
          <p className="flex flex-wrap gap-1">
            {(WORKFLOW_DESCRIPTIONS[w.clusterConfig.workflowType]?.steps ?? []).map((s, i) => (
              <span
                key={s}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {i + 1}. {s}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Cluster Personnalisé : domaine libre + mode de stock */}
      {w.selectedCluster === "personnalise" && (
        <div className="space-y-3 rounded-xl border bg-accent/40 p-3 mt-2">
          <div>
            <Label htmlFor="ob-custom-domain">Votre domaine d'activité</Label>
            <Input
              id="ob-custom-domain"
              value={w.customDomain}
              onChange={(e) => w.setCustomDomain(e.target.value)}
              placeholder="Ex : Vente de pièces détachées, Photocopie…"
              className="h-11"
              autoFocus
            />
          </div>
          <div>
            <Label>Comment gérez-vous votre stock ?</Label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                {
                  id: "unit" as const,
                  title: "Stock normal",
                  desc: "À l'unité / à la pièce",
                },
                {
                  id: "weight" as const,
                  title: "Stock au kilo",
                  desc: "Vente et stock en kg",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => w.setCustomStockChoice(m.id)}
                  aria-pressed={w.customStockChoice === m.id}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-colors",
                    w.customStockChoice === m.id
                      ? "border-primary bg-accent ring-1 ring-primary"
                      : "bg-card hover:border-primary/50",
                  )}
                >
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs text-muted-foreground">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </StepShell>
  );
}
