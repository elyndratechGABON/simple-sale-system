import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, ChevronDown, ChevronUp, X } from "lucide-react";
import { cancelSale, getSaleItems, listSales, type Sale } from "@/lib/db";
import { formatDay, formatFCFA, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { verifyPin } from "@/lib/pin";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Historique des ventes — Caisse POS" },
      {
        name: "description",
        content: "Toutes les ventes enregistrées, groupées par jour, avec annulation.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  // Tout l'historique, pas seulement le jour en cours : les ventes d'hier restent
  // consultables. La clé garde le préfixe ["sales"] déjà invalidé par les mutations.
  const { data: sales = [] } = useQuery({
    queryKey: ["sales", "all"],
    queryFn: () => listSales(),
  });

  const total = sales.reduce((s, x) => s + x.total, 0);

  // listSales trie déjà du plus récent au plus ancien : l'ordre d'insertion de la Map
  // donne donc les jours dans le bon ordre.
  const days = useMemo(() => {
    const map = new Map<number, Sale[]>();
    for (const s of sales) {
      const key = new Date(s.timestamp).setHours(0, 0, 0, 0);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return Array.from(map.entries());
  }, [sales]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" /> Historique des ventes
        </h1>
        <p className="text-sm text-muted-foreground">
          {sales.length} vente{sales.length > 1 ? "s" : ""} · Total encaissé{" "}
          <span className="font-semibold text-foreground">{formatFCFA(total)}</span>
        </p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            Aucune vente enregistrée.
          </CardContent>
        </Card>
      ) : (
        days.map(([day, daySales]) => (
          <section key={day} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 pt-2">
              {/* first-letter et non capitalize : en français seul le premier mot prend
                  la majuscule (« mercredi 29 juillet 2026 »). */}
              <h2 className="font-semibold first-letter:uppercase">{formatDay(day)}</h2>
              <span className="text-sm text-muted-foreground">
                {daySales.length} vente{daySales.length > 1 ? "s" : ""} ·{" "}
                <span className="font-semibold text-foreground">
                  {formatFCFA(daySales.reduce((s, x) => s + x.total, 0))}
                </span>
              </span>
            </div>
            {daySales.map((s) => (
              <SaleRow key={s.id} sale={s} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const [open, setOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ["sale_items", sale.id],
    queryFn: () => getSaleItems(sale.id),
    enabled: open,
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelSale(sale.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Vente annulée, stock restauré");
      setPinOpen(false);
      setPin("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="font-semibold">{formatTime(sale.timestamp)}</div>
            <div className="text-sm text-muted-foreground">
              Donné {formatFCFA(sale.cash_given)} · Rendu {formatFCFA(sale.change_due)}
            </div>
          </div>
          <div className="text-xl font-bold text-primary">{formatFCFA(sale.total)}</div>
          {sale.day_closed && <Badge variant="secondary">clôturée</Badge>}
          <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPinOpen(true)}
            disabled={sale.day_closed}
          >
            <X className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        {open && (
          <div className="mt-3 border-t pt-3 space-y-1 text-sm">
            {items.data?.map((it) => (
              <div key={it.id} className="flex justify-between">
                <span>
                  {it.quantity} × {it.name}
                </span>
                <span className="font-medium">{formatFCFA(it.price_at_sale * it.quantity)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler cette vente ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Entrez le code PIN pour confirmer l'annulation. Le stock sera restauré.
            </p>
            <div>
              <Label htmlFor="pin">Code PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPinOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!verifyPin(pin)) {
                  toast.error("Code PIN incorrect");
                  return;
                }
                cancelMut.mutate();
              }}
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
