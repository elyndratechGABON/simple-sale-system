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
} from "@/features/rentals/hooks/use-rentals";
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
import { RentalBookingDialog } from "./RentalBookingDialog";
import { RentalReturnDialog } from "./RentalReturnDialog";
import { AssetCard, RentalRow } from "./RentalCards";

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
