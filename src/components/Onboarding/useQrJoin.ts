import { toast } from "sonner";
import { parsePairingPayload, applyPairingShop } from "@/lib/pairing";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import type { ClusterId } from "@/lib/settings";

export function useQrJoin(apply: {
  phone: (v: string) => void;
  password: (v: string) => void;
  accountName: (v: string) => void;
  qrScanned: (v: boolean) => void;
  storeName: (v: string) => void;
  ownerName: (v: string) => void;
  shopPhone: (v: string) => void;
  quarter: (v: string) => void;
  cluster: (v: ClusterId) => void;
  customDomain: (v: string) => void;
  customUnit: (v: "unit" | "weight" | null) => void;
}) {
  const { startScan } = useBarcodeScanner();

  /** Rattache cet écran au compte encodé dans un QR affiché par une caisse abonnée. */
  async function scanPairingQr() {
    try {
      const raw = await startScan();

      if (raw === null) return;

      const parsed = parsePairingPayload(raw);

      if (!parsed) {
        toast.error("Ce code n'est pas un code d'appairage ELYNDRA.");
        return;
      }

      apply.phone(parsed.phone ?? "");
      apply.password(parsed.password ?? "");
      apply.accountName(parsed.name ?? "");
      apply.qrScanned(true);

      const shop = parsed.shop ?? {};
      const applied = await applyPairingShop(shop);
      if (shop) {
        apply.storeName(shop.storeName ?? "");
        apply.ownerName(shop.ownerName ?? "");
        apply.shopPhone(shop.phone ?? "");
        apply.quarter(shop.quarter ?? "");
        if (shop.cluster) {
          apply.cluster(shop.cluster);
          apply.customDomain(shop.customDomain ?? "");
          apply.customUnit(shop.customUnitType ?? null);
        }
      }

      toast.success(
        applied
          ? `Compte « ${parsed.name || parsed.phone} » récupéré — copie de la boutique appliquée, continuez.`
          : `Compte « ${parsed.name || parsed.phone} » récupéré — continuez.`,
      );
    } catch {
      toast.error("Caméra indisponible — saisissez le téléphone et le mot de passe à la main.");
    }
  }

  return { scanPairingQr };
}
