// Recharge à distance : le propriétaire envoie une quantité de stock à UN écran
// employé. Renvoie vers le moteur via `sendRecharge` (op `stock.adjusted` ciblée) —
// aucun stock local n'est touché : c'est la boîte des employés que l'on crédite.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { sendRecharge, type Product } from "@/lib/db";
import { getIdentity } from "@/lib/syncengine/identity";
import { listPairedDevices } from "@/lib/syncengine/peers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RechargeDialog({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [deviceIds, setDeviceIds] = useState("");
  const [qty, setQty] = useState("");
  const identity = getIdentity();
  const { data: pairs } = useQuery({
    queryKey: ["paired_devices"],
    queryFn: () => listPairedDevices(identity?.shopId ?? ""),
    enabled: product !== null && !!identity,
    staleTime: 30_000,
  });
  const employees = (pairs ?? []).filter((d) => d.role === "employee" && d.status === "paired");

  const productId = product?.id;
  useEffect(() => {
    if (!productId) return;
    setDeviceIds("");
    setQty("");
  }, [productId]);

  const rechargeMut = useMutation({
    mutationFn: () => {
      if (!deviceIds) throw new Error("Sélectionnez un écran.");
      const q = Number(qty) || 0;
      if (q <= 0) throw new Error("Quantité invalide.");
      return sendRecharge(product!.id, deviceIds, q);
    },
    onSuccess: () => {
      toast.success(`${product!.name} : +${qty} envoyé à l'écran`);
      qc.invalidateQueries({ queryKey: ["paired_devices"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={product !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {product !== null && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">Recharge à distance</DialogTitle>
              <DialogDescription>
                Envoie {product.name} à un écran employé. Il verra la quantité dans son journal dès
                le prochain tour de synchronisation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Écran destinataire</Label>
                {employees.length === 0 ? (
                  <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    Aucun écran employé appairé pour l'instant.
                  </p>
                ) : (
                  <div className="grid gap-1.5">
                    {employees.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDeviceIds(d.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                          deviceIds === d.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                        }`}
                      >
                        <span className="truncate font-medium">
                          {d.device_name || "Écran sans nom"}
                        </span>
                        {deviceIds === d.id && <span className="text-xs text-primary">choisi</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recharge-qty">Quantité à envoyer</Label>
                <Input
                  id="recharge-qty"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="ex. 12"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button
                onClick={() => rechargeMut.mutate()}
                disabled={!deviceIds || !qty || Number(qty) <= 0 || rechargeMut.isPending}
                aria-busy={rechargeMut.isPending}
              >
                {rechargeMut.isPending ? "Envoi…" : "Envoyer la recharge"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
