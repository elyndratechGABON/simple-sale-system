import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ProductForm } from "@/components/ProductForm";
import type { PosController } from "./usePos";

/**
 * Catalogue vide : c'est le tout premier lancement, et la main est déjà ici. Créer le
 * premier produit sans quitter la caisse évite au nouveau commerçant de chercher l'écran
 * Stocks au moment où il n'a encore rien à vendre.
 */
export function EmptyCatalog({ pos }: { pos: PosController }) {
  if (pos.products.length > 0) return null;
  return (
    <Card className="mt-3">
      <CardContent className="space-y-3 p-8 text-center">
        <p className="font-semibold">Votre catalogue est vide.</p>
        <p className="text-sm text-muted-foreground">
          Créez votre premier produit pour commencer à vendre.
        </p>
        <Dialog open={pos.createOpen} onOpenChange={pos.setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-5 w-5 mr-1" /> Créer un produit
            </Button>
          </DialogTrigger>
          <ProductForm
            editing={null}
            onClose={() => pos.setCreateOpen(false)}
            defaultCategory={pos.isService ? "Service" : undefined}
            defaultType={pos.isService ? "service" : undefined}
          />
        </Dialog>
        <p className="text-sm text-muted-foreground">
          Vous pouvez aussi utiliser « Article manuel » dans le panier pour encaisser sans
          catalogue, ou gérer vos produits dans{" "}
          <Link to="/stocks" className="text-primary underline">
            Stocks
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
