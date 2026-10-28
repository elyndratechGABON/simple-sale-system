import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Sparkles, Store } from "lucide-react";
import { ACTIVE_CLUSTERS, savePreferences } from "@/lib/settings";
import { usePreferences } from "@/hooks/use-preferences";
import type { ClusterId } from "@/lib/settings/types";
import { resolveIcon } from "@/components/settings/icon-map";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Type de commerce sur UNE ligne : le résumé seul suffit au quotidien, le choix
 * complet vit dans un dialogue. Changer de cluster est rare et cosmétique
 * (icône, labels, workflow par défaut) — il ne touche ni les tables ni les ventes.
 */
export function ClusterCard() {
  const qc = useQueryClient();
  const { cluster, customDomain } = usePreferences();
  const clusterConfig = ACTIVE_CLUSTERS.find((c) => c.id === cluster);
  const ClusterIcon = clusterConfig ? resolveIcon(clusterConfig.icon) : Store;
  const [open, setOpen] = useState(false);

  function select(id: ClusterId) {
    if (id === cluster) {
      setOpen(false);
      return;
    }
    savePreferences({ cluster: id });
    qc.invalidateQueries({ queryKey: ["preferences"] });
    toast.success("Type de commerce mis à jour");
    setOpen(false);
  }

  return (
    <div className="flat-card space-y-4">
      <header className="space-y-1">
        <h2 className="text-title flex items-center gap-2">
          <Store className="h-5 w-5" /> Type de commerce
        </h2>
      </header>

      {clusterConfig && (
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ClusterIcon className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold truncate">
              {clusterConfig.label.split("/")[0].trim()}
              {cluster === "personnalise" && customDomain && (
                <span className="font-normal text-muted-foreground"> — {customDomain}</span>
              )}
            </p>
            <p className="text-small text-muted-foreground truncate">{clusterConfig.description}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
            Modifier <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choisir votre activité</DialogTitle>
            <DialogDescription>
              Icône et workflow par défaut — modifiable à tout moment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {ACTIVE_CLUSTERS.map((c) => {
              const Icon = resolveIcon(c.icon);
              const isCurrent = c.id === cluster;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    isCurrent ? "border-primary bg-accent/50" : "hover:bg-accent/50"
                  }`}
                  aria-pressed={isCurrent}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-medium">{c.label}</span>
                    <span className="block text-small text-muted-foreground">{c.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
