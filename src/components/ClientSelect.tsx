import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchClients, getClientStats, type Client } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

/**
 * Sélecteur de client avec autocomplete. Cluster service uniquement.
 *
 * - Tape un nom → recherche instantanée dans le registre
 * - Sélectionne un client existant → stats (visites, dépensé)
 * - Tape un nom inconnu → création automatique au moment de la vente
 * - Touche × → réinitialise la sélection
 */
export function ClientSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string, clientId?: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [open, setOpen] = useState(false);

  const { data: results = [] } = useQuery({
    queryKey: ["clients", "search", query],
    queryFn: () => searchClients(query),
    enabled: open && query.length > 0,
  });

  const { data: stats } = useQuery({
    queryKey: ["client", "stats", selectedClient?.id],
    queryFn: () => getClientStats(selectedClient!.id),
    enabled: !!selectedClient,
  });

  function handleSelect(client: Client) {
    setSelectedClient(client);
    setQuery(client.name);
    onChange(client.name, client.id);
    setOpen(false);
  }

  function handleChange(val: string) {
    setQuery(val);
    setSelectedClient(null);
    onChange(val);
    setOpen(val.length > 0);
  }

  function handleClear() {
    setQuery("");
    setSelectedClient(null);
    onChange("");
    setOpen(false);
  }

  const filtered = useMemo(
    () => results.filter((c) => !selectedClient || c.id !== selectedClient.id),
    [results, selectedClient],
  );

  return (
    <div className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="client-name"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Nom du client…"
          className="h-11 pl-9 pr-8"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {/* Stats du client sélectionné */}
      {selectedClient && stats && (
        <div className="mt-1.5 flex items-center gap-3 rounded-md bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {stats.visits} visite{stats.visits > 1 ? "s" : ""}
          </span>
          {stats.totalSpent > 0 && <span>{formatFCFA(stats.totalSpent)} dépensés</span>}
          {stats.lastVisit && (
            <span>Dernière visite : {new Date(stats.lastVisit).toLocaleDateString("fr-FR")}</span>
          )}
        </div>
      )}

      {/* Liste des suggestions */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-card shadow-lg">
          {filtered.slice(0, 8).map((client) => (
            <button
              key={client.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(client);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                "hover:bg-accent",
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{client.name}</div>
                {client.phone && (
                  <div className="text-xs text-muted-foreground">{client.phone}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
