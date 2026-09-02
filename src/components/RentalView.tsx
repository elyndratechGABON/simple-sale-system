import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Search,
} from "lucide-react";
import { listProducts, type Product, type Rental } from "@/lib/db";
import { formatFCFA } from "@/lib/format";
import {
  useActiveRentals,
  useAllRentals,
  useMarkOverdueRentals,
  rentalTotal,
} from "@/hooks/use-rentals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProductForm } from "@/components/ProductForm";
import { RentalBookingDialog } from "@/components/RentalBookingDialog";
import { RentalReturnDialog } from "@/components/RentalReturnDialog";

const STATUS_CONFIG: Record<
  Rental["status"],
  { label: string; variant: "default" | "destructive" | "secondary"; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    variant: "default",
    icon: <Clock className="h-3 w-3" />,
  },
  returned: {
    label: "Retournée",
    variant: "secondary",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  overdue: {
    label: "En retard",
    variant: "destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  cancelled: {
    label: "Annulée",
    variant: "secondary",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const UNIT_LABELS: Record<string, string> = {
  hour: "/heure",
  day: "/jour",
  week: "/semaine",
  month: "/mois",
  year: "/an",
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildPricingSummary(p: Product): string {
  const rp = p.rental_pricing;
  if (!rp) return "—";
  const parts: string[] = [];
  if (rp.hour) parts.push(`${formatFCFA(rp.hour)}/heure`);
  if (rp.day) parts.push(`${formatFCFA(rp.day)}/jour`);
  if (rp.week) parts.push(`${formatFCFA(rp.week)}/semaine`);
  if (rp.month) parts.push(`${formatFCFA(rp.month)}/mois`);
  if (rp.year) parts.push(`${formatFCFA(rp.year)}/an`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function rentalBaseTotal(r: Rental): number {
  return r.price_per_unit * r.quantity;
}

function useAssetRentalCount() {
  const { data: rentals = [] } = useActiveRentals();
  const counts: Record<string, number> = {};
  for (const r of rentals) {
    counts[r.asset_id] = (counts[r.asset_id] ?? 0) + r.quantity;
  }
  return counts;
}

function AssetCard({ asset, onBook }: { asset: Product; onBook: (a: Product) => void }) {
  const rentedCount = useAssetRentalCount();
  const totalUnits = asset.total_units ?? 1;
  const rented = rentedCount[asset.id] ?? 0;
  const available = totalUnits - rented;

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => onBook(asset)}
    >
      <CardContent className="p-3">
        {asset.photo ? (
          <img
            src={asset.photo}
            alt={asset.name}
            className="h-24 w-full rounded object-cover mb-2"
          />
        ) : (
          <div className="flex h-24 w-full items-center justify-center rounded bg-muted mb-2">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="font-medium text-sm truncate">{asset.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{buildPricingSummary(asset)}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {totalUnits} unité{totalUnits > 1 ? "s" : ""}
          </span>
          {available <= 0 ? (
            <Badge variant="destructive" className="text-xs">
              Complet
            </Badge>
          ) : available < totalUnits ? (
            <Badge variant="default" className="text-xs">
              {available}/{totalUnits} libre{available > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {totalUnits} libre{totalUnits > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RentalRow({ rental, onReturn }: { rental: Rental; onReturn: (r: Rental) => void }) {
  const config = STATUS_CONFIG[rental.status];
  const isOverdue = rental.status === "overdue";
  const total = rentalBaseTotal(rental) + (rental.late_fee ?? 0);

  return (
    <div
      className={`flex items-center justify-between rounded border p-3 ${
        isOverdue ? "border-destructive/50 bg-destructive/5" : ""
      }`}
      onClick={() => onReturn(rental)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onReturn(rental);
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isOverdue ? (
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        ) : (
          <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{rental.asset_name}</p>
          <p className="text-xs text-muted-foreground truncate">{rental.client_name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" />
            {formatDate(rental.start_date)} → {formatDate(rental.expected_end_date)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-3">
        <Badge variant={config.variant} className="text-xs gap-1">
          {config.icon}
          {config.label}
        </Badge>
        <p className="text-sm font-medium mt-1">{formatFCFA(total)}</p>
        {rental.quantity > 1 && <p className="text-xs text-muted-foreground">×{rental.quantity}</p>}
      </div>
    </div>
  );
}

export function RentalView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingAsset, setBookingAsset] = useState<Product | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [returnRental, setReturnRental] = useState<Rental | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  });

  const assets = products.filter((p) => p.is_asset === true || p.total_units != null);

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const { data: activeRentals = [] } = useActiveRentals();
  const { data: allRentals = [] } = useAllRentals();
  const markOverdue = useMarkOverdueRentals();

  function handleBookAsset(asset: Product) {
    setBookingAsset(asset);
    setBookingOpen(true);
  }

  function handleReturnRental(rental: Rental) {
    if (rental.status === "active" || rental.status === "overdue") {
      setReturnRental(rental);
      setReturnOpen(true);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Location d'actifs
        </h2>
        <Button size="sm" onClick={() => markOverdue.mutate()}>
          <AlertTriangle className="h-4 w-4 mr-1" />
          Vérifier retards
        </Button>
      </div>

      <Tabs defaultValue="actifs">
        <TabsList>
          <TabsTrigger value="actifs">Actifs ({assets.length})</TabsTrigger>
          <TabsTrigger value="actives">Locations actives ({activeRentals.length})</TabsTrigger>
          <TabsTrigger value="historique">Historique ({allRentals.length})</TabsTrigger>
        </TabsList>

        {/* ── Actifs ──────────────────────────────────────────────── */}
        <TabsContent value="actifs" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un actif…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Dialog open={productFormOpen} onOpenChange={setProductFormOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nouvel actif
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Créer un actif</DialogTitle>
                </DialogHeader>
                <ProductForm editing={null} onClose={() => setProductFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          {filteredAssets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-10 w-10 mb-3" />
                <p className="text-sm">Aucun actif trouvé</p>
                <p className="text-xs mt-1">
                  {assets.length === 0
                    ? "Créez votre premier actif de location"
                    : "Aucun résultat pour cette recherche"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredAssets.map((a) => (
                <AssetCard key={a.id} asset={a} onBook={handleBookAsset} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Locations actives ───────────────────────────────────── */}
        <TabsContent value="actives" className="space-y-3">
          {activeRentals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3" />
                <p className="text-sm">Aucune location active</p>
                <p className="text-xs mt-1">Sélectionnez un actif pour démarrer une location</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {activeRentals.map((r) => (
                <RentalRow key={r.id} rental={r} onReturn={handleReturnRental} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Historique ──────────────────────────────────────────── */}
        <TabsContent value="historique" className="space-y-3">
          {allRentals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-3" />
                <p className="text-sm">Aucune location enregistrée</p>
                <p className="text-xs mt-1">L'historique apparaîtra ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {allRentals.map((r) => (
                <RentalRow key={r.id} rental={r} onReturn={handleReturnRental} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogues ──────────────────────────────────────────────── */}
      {bookingAsset && (
        <RentalBookingDialog
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          asset={bookingAsset}
        />
      )}

      {returnRental && (
        <RentalReturnDialog open={returnOpen} onOpenChange={setReturnOpen} rental={returnRental} />
      )}
    </div>
  );
}
